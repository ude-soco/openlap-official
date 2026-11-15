package com.openlap.community;

import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import com.openlap.isc_module.entities.IscStatus;
import com.openlap.user.services.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

@Service
public class CommunityIscService {
  private final CommunityCatalogService catalog;
  private final MongoTemplate mongo;
  private final TokenService tokens;
  private volatile boolean indexed;
  public CommunityIscService(CommunityCatalogService catalog,
      @Qualifier("primaryMongoTemplate") MongoTemplate mongo, TokenService tokens) {
    this.catalog = catalog; this.mongo = mongo; this.tokens = tokens;
  }
  public Map<String, Object> detail(HttpServletRequest request, String poolId) {
    IndicatorSpecificationCard source = catalog.resolveIsc(poolId);
    CommunityIscTemplate template = CommunityIscTemplate.from(source);
    Map<String, Object> result = new LinkedHashMap<>(catalog.metadata("isc", poolId, tokens.getUserFromToken(request).getId()));
    result.put("name", template.name()); result.put("version", template.version());
    result.put("requirements", template.requirements()); result.put("dataset", template.dataset());
    result.put("visRef", template.visRef()); result.put("exampleData", true);
    return result;
  }
  public Map<String, Object> copy(HttpServletRequest request, String poolId, String version) {
    var user = tokens.getUserFromToken(request);
    String existing = catalog.copiedId("isc", poolId, user.getId());
    if (existing != null) return Map.of("id", existing, "alreadySaved", true);
    CommunityIscTemplate template = CommunityIscTemplate.from(catalog.resolveIsc(poolId));
    if (version == null || !version.equals(template.version()))
      throw new ConflictException("COMMUNITY_ENTRY_CHANGED", "This specification changed. Reopen its details before saving.");
    ensureIndex();
    LocalDateTime now = LocalDateTime.now();
    IndicatorSpecificationCard copy = IndicatorSpecificationCard.builder()
        .id(UUID.randomUUID().toString()).communityId(UUID.randomUUID().toString())
        .communitySourceId(poolId).communitySourceVersion(version)
        .requirements(CommunitySanitizer.json(template.requirements()))
        .dataset(CommunitySanitizer.json(template.dataset())).visRef(CommunitySanitizer.json(template.visRef()))
        .lockedStep(CommunitySanitizer.json(template.lockedStep())).indicatorName(template.name())
        .createdBy(user).createdOn(now).updatedOn(now).status(IscStatus.SAVED).build();
    // Another tab can race this insert; the unique owner/source key makes the action idempotent.
    try { mongo.insert(copy); }
    catch (DuplicateKeyException collision) {
      existing = catalog.copiedId("isc", poolId, user.getId());
      if (existing == null) throw collision;
      return Map.of("id", existing, "alreadySaved", true);
    }
    return Map.of("id", copy.getId(), "alreadySaved", false);
  }
  private synchronized void ensureIndex() {
    if (indexed) return;
    mongo.indexOps(IndicatorSpecificationCard.class).ensureIndex(new Index()
        .on("createdBy.$id", Sort.Direction.ASC).on("communitySourceId", Sort.Direction.ASC).unique()
        .partial(PartialIndexFilter.of(Criteria.where("communitySourceId").type(2).and("status").is("SAVED"))));
    indexed = true;
  }
}
