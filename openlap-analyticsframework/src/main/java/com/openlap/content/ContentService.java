package com.openlap.content;

import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.NotFoundException;
import com.openlap.infrastructure.exception.ValidationException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Collation;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
public class ContentService {
  private final MongoTemplate mongo;
  private final ContentValidator validator;

  public ContentService(@Qualifier("primaryMongoTemplate") MongoTemplate mongo, ContentValidator validator) {
    this.mongo = mongo;
    this.validator = validator;
  }

  public Page<Map<String, Object>> published(ContentKind kind, int page, int size) {
    Pageable pageable = page(page, size);
    Query query = Query.query(Criteria.where("status").is("PUBLISHED").and("deletedAt").is(null));
    long total = mongo.count(query, kind.getCollection());
    String date = kind == ContentKind.NEWS ? "published.date" : "published.year";
    query.with(pageable).with(Sort.by(Sort.Order.desc(date), Sort.Order.asc("sortOrder"), Sort.Order.asc("_id")));
    List<Map<String, Object>> result = new ArrayList<>();
    for (ContentEntry entry : mongo.find(query, ContentEntry.class, kind.getCollection())) {
      if (entry.getPublished() != null) {
        Map<String, Object> item = new LinkedHashMap<>(entry.getPublished());
        item.put("id", entry.getId());
        result.add(item);
      }
    }
    return new PageImpl<>(result, pageable, total);
  }

  public Page<ContentEntry> list(ContentKind kind, int page, int size, String search, String status,
      String sortBy, String direction) {
    Pageable requested = page(page, size);
    Pageable pageable = PageRequest.of(requested.getPageNumber(), requested.getPageSize(),
        contentSort(kind, sortBy, direction));
    if (!java.util.Arrays.asList("ALL", "DRAFT", "PUBLISHED", "TRASH").contains(status)) {
      throw new ValidationException("Choose a valid content status.");
    }
    Criteria criteria = "ALL".equals(status) ? Criteria.where("status").ne("TRASH") : Criteria.where("status").is(status);
    if (search != null && !search.trim().isEmpty()) {
      if (search.length() > 200) throw new ValidationException("Search must be 200 characters or fewer.");
      Pattern pattern = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
      criteria.andOperator(new Criteria().orOperator(Criteria.where("draft.title").regex(pattern),
          Criteria.where("draft.authors").regex(pattern), Criteria.where("draft.venue").regex(pattern)));
    }
    Query query = Query.query(criteria);
    long count = mongo.count(query, kind.getCollection());
    query.with(pageable);
    if ("title".equals(sortBy)) {
      query.collation(Collation.of("en").strength(Collation.ComparisonLevel.secondary()));
    }
    return new PageImpl<>(mongo.find(query, ContentEntry.class, kind.getCollection()), pageable, count);
  }

  private Sort contentSort(ContentKind kind, String sortBy, String direction) {
    String property;
    if ("title".equals(sortBy)) property = "draft.title";
    else if ("date".equals(sortBy)) property = kind == ContentKind.NEWS ? "draft.date" : "draft.year";
    else if ("status".equals(sortBy)) property = "status";
    else if ("updatedAt".equals(sortBy)) property = "updatedAt";
    else throw new ValidationException("Choose Title, Date/Year, Status, or Updated to sort content.");
    Sort.Direction order;
    if ("asc".equalsIgnoreCase(direction)) order = Sort.Direction.ASC;
    else if ("desc".equalsIgnoreCase(direction)) order = Sort.Direction.DESC;
    else throw new ValidationException("Choose ascending (asc) or descending (desc) sorting.");
    // A unique tie breaker keeps pagination stable when dates or statuses match.
    return Sort.by(new Sort.Order(order, property), Sort.Order.asc("_id"));
  }

  public ContentEntry get(ContentKind kind, String id) {
    ContentEntry entry = mongo.findById(id, ContentEntry.class, kind.getCollection());
    if (entry == null) throw new NotFoundException("Content entry not found.");
    return entry;
  }

  public ContentEntry create(ContentKind kind, Map<String, Object> draft) {
    ContentEntry entry = new ContentEntry();
    entry.setId(UUID.randomUUID().toString());
    entry.setDraft(validator.validate(kind, draft, false));
    entry.setStatus("DRAFT");
    entry.setVersion(1);
    entry.setCreatedAt(Instant.now());
    entry.setUpdatedAt(entry.getCreatedAt());
    entry.setCreatedBy(actor());
    entry.setUpdatedBy(entry.getCreatedBy());
    entry.setSortOrder(-System.currentTimeMillis());
    return mongo.insert(entry, kind.getCollection());
  }

  public ContentEntry save(ContentKind kind, String id, Map<String, Object> draft, Long version) {
    ContentEntry entry = editable(kind, id, version);
    return change(kind, entry, new Update().set("draft", validator.validate(kind, draft, false)));
  }

  public ContentEntry transition(ContentKind kind, String id, Long version, String action) {
    ContentEntry entry = get(kind, id);
    requireVersion(entry, version);
    Update update = new Update();
    if ("restore".equals(action)) {
      if (!"TRASH".equals(entry.getStatus())) throw new ValidationException("Only entries in Trash can be restored.");
      update.set("status", "DRAFT").set("published", null).set("deletedAt", null);
    } else {
      if ("TRASH".equals(entry.getStatus())) throw new ConflictException("Restore this entry before editing it.");
      if ("publish".equals(action)) {
        update.set("published", validator.validate(kind, entry.getDraft(), true)).set("status", "PUBLISHED");
      } else if ("unpublish".equals(action)) {
        if (!"PUBLISHED".equals(entry.getStatus())) throw new ValidationException("This entry is already unpublished.");
        update.set("published", null).set("status", "DRAFT");
      } else if ("trash".equals(action)) {
        update.set("status", "TRASH").set("deletedAt", Instant.now());
      } else throw new NotFoundException("Content action not found.");
    }
    return change(kind, entry, update);
  }

  private ContentEntry editable(ContentKind kind, String id, Long version) {
    ContentEntry entry = get(kind, id);
    requireVersion(entry, version);
    if ("TRASH".equals(entry.getStatus())) throw new ConflictException("Restore this entry before editing it.");
    return entry;
  }

  private void requireVersion(ContentEntry entry, Long version) {
    if (version == null || version < 1) throw new ValidationException("A valid version is required. Reload the entry and try again.");
    if (version != entry.getVersion()) throw conflict();
  }

  private ContentEntry change(ContentKind kind, ContentEntry entry, Update update) {
    update.inc("version", 1).set("updatedAt", Instant.now()).set("updatedBy", actor());
    Query query = Query.query(Criteria.where("_id").is(entry.getId()).and("version").is(entry.getVersion()));
    ContentEntry changed = mongo.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true),
        ContentEntry.class, kind.getCollection());
    if (changed == null) throw conflict();
    return changed;
  }

  private ConflictException conflict() {
    return new ConflictException("CONTENT_VERSION_CONFLICT", "Someone changed this entry. Reload it before saving your changes.");
  }

  private String actor() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    return authentication == null ? "unknown" : authentication.getName();
  }

  private Pageable page(int page, int size) {
    if (page < 0 || size < 1 || size > 100) throw new ValidationException("Use a non-negative page and a page size from 1 to 100.");
    return PageRequest.of(page, size);
  }
}
