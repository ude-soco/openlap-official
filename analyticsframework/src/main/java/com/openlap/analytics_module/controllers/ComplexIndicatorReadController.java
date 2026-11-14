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

  @GetMapping("/sources")
  public ResponseEntity<?> sources(HttpServletRequest request,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "") String searchText) {
    Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(50, Math.max(1, size)),
        Sort.by("name").ascending().and(Sort.by("id")));
    if (searchText.length() > 300) throw ComplexIndicatorException.invalid("Search must be 300 characters or fewer.");
    Page<Indicator> result = indicators.findBasicIndicatorByCreatedBy_IdAndNameLike(
        new ObjectId(tokens.getUserFromToken(request).getId()), Pattern.quote(searchText.trim()), pageable);
    List<Map<String, Object>> rows = result.getContent().stream().map(this::sourceSummary).toList();
    return ResponseEntity.ok(new ApiSuccess(HttpStatus.OK, "Saved Basic indicators found.",
        new PageImpl<>(rows, pageable, result.getTotalElements())));
  }

  private Map<String, Object> sourceSummary(Indicator source) {
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
      row.put("outputs", analytics.getAnalyticsTechniqueOutputs(method.getId()));
      row.put("available", true);
      // Saved query is the owner's existing configuration, never evaluated while browsing.
      row.put("indicatorQuery", new Gson().fromJson(source.getIndicatorQuery(), Object.class));
    } catch (RuntimeException error) {
      row.put("unavailableReason", "The source method's outputs could not be loaded. Check its plugin and retry.");
    }
    return row;
  }

  @GetMapping("/{id}/result")
  public ResponseEntity<?> result(HttpServletRequest request, @PathVariable String id) {
    Indicator parent = indicators.findById(id).orElseThrow(() -> new ComplexIndicatorException(
        HttpStatus.NOT_FOUND, "INDICATOR_NOT_FOUND", "This indicator is no longer available."));
    if (parent.getCreatedBy() == null
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
