package com.openlap.analytics_module.services;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorsToMergeRequest;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.entities.utility_entities.IndicatorsToMerge;
import com.openlap.analytics_module.exceptions.indicator.ComplexIndicatorException;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.user.services.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** A single eligibility policy for picker, execution and persistence. */
@Service
@RequiredArgsConstructor
public class ComplexIndicatorSourceGuard {
  public static final int MAX_SOURCES = 10;
  private final IndicatorRepository indicators;
  private final TokenService tokens;

  public void validate(HttpServletRequest request, List<IndicatorsToMergeRequest> sources,
      boolean sameMethod) {
    if (sources == null || sources.stream().anyMatch(s -> s == null)) {
      throw ComplexIndicatorException.invalid("Choose at least two saved Basic indicators.");
    }
    validateIds(request, sources.stream().map(IndicatorsToMergeRequest::getIndicatorId).toList(),
        sameMethod, true);
  }

  public void validateIds(HttpServletRequest request, List<String> ids, boolean sameMethod,
      boolean requireMultiple) {
    validateForOwner(tokens.getUserFromToken(request).getId(), ids, sameMethod, requireMultiple);
  }

  public void validateForOwner(String owner, List<String> ids, boolean sameMethod,
      boolean requireMultiple) {
    if (ids == null || ids.size() < (requireMultiple ? 2 : 1) || ids.size() > MAX_SOURCES
        || ids.stream().anyMatch(id -> id == null || id.isBlank())
        || new HashSet<>(ids).size() != ids.size()) {
      throw ComplexIndicatorException.invalid("Choose " + (requireMultiple ? "2" : "1")
          + "–10 distinct saved Basic indicators.");
    }
    List<Indicator> resolved = new ArrayList<>();
    for (String id : ids) {
      resolved.add(indicators.findById(id).orElseThrow(() -> new ComplexIndicatorException(
          HttpStatus.NOT_FOUND, "SOURCE_INDICATOR_UNAVAILABLE",
          "A source indicator is no longer available. Review your selection.")));
    }
    validateResolved(owner, resolved, sameMethod);
  }

  public static void validateResolved(String owner, List<Indicator> sources, boolean sameMethod) {
    String method = null;
    for (Indicator source : sources) {
      if (source == null || source.getCreatedBy() == null
          || !java.util.Objects.equals(owner, source.getCreatedBy().getId())) {
        throw new ComplexIndicatorException(HttpStatus.FORBIDDEN, "SOURCE_INDICATOR_NOT_ALLOWED",
            "Choose your own saved Basic indicators.");
      }
      if (source.getIndicatorType() != IndicatorType.BASIC) {
        throw ComplexIndicatorException.invalid("Complex indicators can currently use Basic sources only.");
      }
      if (source.getAnalyticsTechniqueReference() == null
          || source.getAnalyticsTechniqueReference().getAnalyticsTechnique() == null) {
        throw ComplexIndicatorException.invalid("A source's analytics method is unavailable.");
      }
      String current = source.getAnalyticsTechniqueReference().getAnalyticsTechnique().getId();
      if (sameMethod && method != null && !method.equals(current)) {
        throw ComplexIndicatorException.invalid(
            "Composite sources must use the same analytics method. Choose matching Basic indicators.");
      }
      method = current;
    }
  }

  public void validateSaved(Indicator parent) {
    if (parent.getIndicators() == null || parent.getCreatedBy() == null) {
      throw ComplexIndicatorException.invalid("The saved indicator has no usable source configuration.");
    }
    List<String> ids = new ArrayList<>();
    for (IndicatorsToMerge source : parent.getIndicators()) {
      if (source == null || source.getIndicator() == null) {
        throw ComplexIndicatorException.invalid("A saved source is unavailable. Edit the indicator to repair it.");
      }
      ids.add(source.getIndicator().getId());
    }
    validateForOwner(parent.getCreatedBy().getId(), ids,
        parent.getIndicatorType() == IndicatorType.COMPOSITE, true);
  }
}
