package com.openlap.community;

import com.openlap.response.ApiSuccess;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/community/indicators")
public class CommunityIndicatorSearchController {
  private final CommunityCatalogService catalog;
  private final ObjectProvider<CommunityVectorSearch> vectorSearch;

  public CommunityIndicatorSearchController(CommunityCatalogService catalog, ObjectProvider<CommunityVectorSearch> vectorSearch) {
    this.catalog = catalog;
    this.vectorSearch = vectorSearch;
  }

  record Results(List<Map<String, Object>> content, long totalElements, int number, int size, String searchMode) {}

  @PostMapping("/search")
  public ResponseEntity<ApiSuccess> search(HttpServletRequest viewer, @RequestBody CommunitySearchRequest query) {
    query.validate();
    CommunityVectorSearch engine = vectorSearch.getIfAvailable();
    Results results = null;
    if (engine != null) {
      var page = engine.search(query);
      if (page.isPresent()) {
        var ranked = page.get();
        results = new Results(catalog.publicRows(viewer, "indicators", ranked.rows()), ranked.total(),
            query.page(), query.size(), "semantic");
      }
    }
    if (results == null) {
      var page = catalog.page(viewer, "indicators", query.page(), query.size(), query.fallbackText(),
          query.sortBy(), query.sortDirection(), query.type(), query.method(), query.chart(), "");
      results = new Results(page.getContent(), page.getTotalElements(), query.page(), query.size(), "name");
    }
    return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store, private")
        .header(HttpHeaders.PRAGMA, "no-cache").varyBy(HttpHeaders.AUTHORIZATION)
        .body(new ApiSuccess(HttpStatus.OK, "Indicator search complete.", results));
  }
}
