package com.openlap.analytics_module.controllers;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.openlap.analytics_module.dto.requests.indicator.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.entities.utility_entities.IndicatorsToMerge;
import com.openlap.analytics_module.exceptions.indicator.ComplexIndicatorException;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_module.services.*;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import com.openlap.response.ApiSuccess;
import com.openlap.user.services.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/** Lightweight source browsing and fresh, type-aware saved result data. */
@RestController
@RequestMapping("/v1/indicators")
@RequiredArgsConstructor
public class ComplexIndicatorReadController {
  private final IndicatorRepository indicators;
  private final TokenService tokens;
  private final AnalyticsTechniqueService analytics;
  private final ComplexIndicatorSourceGuard sourceGuard;
  private final IndicatorCompositeService composites;
  private final IndicatorMultiLevelService multilevel;
  private final IndicatorService indicatorService;

  @GetMapping("/sources")
  public ResponseEntity<?> sources(HttpServletRequest request,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "") String searchText,
      @RequestParam(defaultValue = "name") String sortBy,
      @RequestParam(defaultValue = "asc") String sortDirection,
      @RequestParam(defaultValue = "") String methodId) {
    if (!"name".equals(sortBy) && !"createdOn".equals(sortBy)) {
      throw ComplexIndicatorException.invalid("Sort by indicator name or creation date.");
    }
    if (!"asc".equalsIgnoreCase(sortDirection) && !"desc".equalsIgnoreCase(sortDirection)) {
      throw ComplexIndicatorException.invalid("Sort direction must be asc or desc.");
    }
    String method = methodId == null ? "" : methodId.trim();
    if (!method.isEmpty() && !ObjectId.isValid(method)) {
      throw ComplexIndicatorException.invalid("Choose a valid installed analytics method.");
    }
    Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(50, Math.max(1, size)),
        Sort.by(Sort.Direction.fromString(sortDirection), sortBy).and(Sort.by("id")));
    if (searchText.length() > 300) throw ComplexIndicatorException.invalid("Search must be 300 characters or fewer.");
    ObjectId owner = new ObjectId(tokens.getUserFromToken(request).getId());
    String search = Pattern.quote(searchText.trim());
    Page<Indicator> result = method.isEmpty()
        ? indicators.findBasicIndicatorByCreatedBy_IdAndNameLike(owner, search, pageable)
        : indicators.findBasicIndicatorByOwnerAndMethodAndNameLike(owner, new ObjectId(method), search, pageable);
    // Many indicators share a method. Resolve its port metadata once per page,
    // including failures, without retaining stale plugin state across requests.
    Map<String, Optional<List<OpenLAPColumnConfigData>>> outputs = new HashMap<>();
    List<Map<String, Object>> rows = result.getContent().stream()
        .map(source -> sourceSummary(source, outputs)).toList();
    return ResponseEntity.ok(new ApiSuccess(HttpStatus.OK, "Saved Basic indicators found.",
        new PageImpl<>(rows, pageable, result.getTotalElements())));
  }

  @GetMapping("/sources/{id}/preview")
  public ResponseEntity<?> sourcePreview(HttpServletRequest request, @PathVariable String id) {
    // Resolve ownership and BASIC eligibility before any plugin can execute.
    sourceGuard.validateIds(request, List.of(id), false, false);
    return ResponseEntity.ok(new ApiSuccess(HttpStatus.OK, "Source indicator preview generated.",
        indicatorService.getIndicatorById(id)));
  }

  private Map<String, Object> sourceSummary(Indicator source,
      Map<String, Optional<List<OpenLAPColumnConfigData>>> outputs) {
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("id", source.getId());
    row.put("name", source.getName());
    row.put("createdOn", source.getCreatedOn());
    row.put("type", source.getIndicatorType());
    row.put("available", false);
    row.put("outputs", List.of());
    try {
      var method = source.getAnalyticsTechniqueReference().getAnalyticsTechnique();
      row.put("analyticsMethod", Map.of("id", method.getId(), "name", method.getName()));
      Optional<List<OpenLAPColumnConfigData>> ports = outputs.computeIfAbsent(method.getId(), id -> {
        try {
          return Optional.of(analytics.getAnalyticsTechniqueOutputs(id));
        } catch (RuntimeException error) {
          return Optional.empty();
        }
      });
      if (ports.isEmpty()) throw new IllegalArgumentException("Unavailable source method");
      row.put("outputs", ports.get());
      // Saved query is the owner's existing configuration, never evaluated while browsing.
      Object query = new Gson().fromJson(source.getIndicatorQuery(), Object.class);
      if (!(query instanceof Map)) throw new IllegalArgumentException("Missing source query");
      row.put("indicatorQuery", query);
      row.put("available", true);
    } catch (RuntimeException error) {
      row.put("unavailableReason", "The source configuration or method could not be loaded. Check the Basic indicator and retry.");
    }
    return row;
  }

  @GetMapping("/{id}/result")
  public ResponseEntity<?> result(HttpServletRequest request, @PathVariable String id) {
    Indicator parent = indicators.findById(id).orElseThrow(() -> new ComplexIndicatorException(
        HttpStatus.NOT_FOUND, "INDICATOR_NOT_FOUND", "This indicator is no longer available."));
    if (parent.getCommunityCopyPending() != null || parent.getCreatedBy() == null
        || !tokens.getUserFromToken(request).getId().equals(parent.getCreatedBy().getId())) {
      throw new ComplexIndicatorException(HttpStatus.FORBIDDEN, "INDICATOR_NOT_ALLOWED",
          "Open one of your own indicators to view its result data.");
    }
    if (parent.getIndicatorType() != IndicatorType.COMPOSITE
        && parent.getIndicatorType() != IndicatorType.MULTI_LEVEL) {
      throw ComplexIndicatorException.invalid("This result endpoint is for complex indicators.");
    }
    sourceGuard.validateSaved(parent);
    Gson gson = new Gson();
    List<IndicatorsToMergeRequest> sources = new ArrayList<>();
    for (IndicatorsToMerge entry : parent.getIndicators()) {
      IndicatorsToMergeRequest source = new IndicatorsToMergeRequest();
      source.setIndicatorId(entry.getIndicator().getId());
      source.setColumnToMerge(gson.fromJson(entry.getColumnToMerge(), OpenLAPColumnConfigData.class));
      source.setMeasureColumnIds(entry.getMeasureColumnIds());
      source.setLabel(entry.getLabel());
      sources.add(source);
    }
    OpenLAPDataSet data;
    if (parent.getIndicatorType() == IndicatorType.COMPOSITE) {
      data = composites.mergeIndicatorsForCompositeIndicator(new IndicatorCompositeMergeRequest(
          gson.fromJson(parent.getColumnToMerge(), OpenLAPColumnConfigData.class), sources));
    } else {
      var technique = parent.getAnalyticsTechniqueReference();
      List<OpenLAPDynamicParam> params = gson.fromJson(technique.getAdditionalParams(),
          new TypeToken<List<OpenLAPDynamicParam>>() {}.getType());
      data = multilevel.analyzeBasicIndicatorsForMultiLevelIndicator(new IndicatorMultiLevelAnalysisRequest(
          sources, technique.getAnalyticsTechnique().getId(),
          gson.fromJson(technique.getQueryToAnalyticsTechniqueMapping(), OpenLAPPortConfig.class), params));
    }
    return ResponseEntity.ok(new ApiSuccess(HttpStatus.OK, "Current indicator result generated.", data));
  }
}
