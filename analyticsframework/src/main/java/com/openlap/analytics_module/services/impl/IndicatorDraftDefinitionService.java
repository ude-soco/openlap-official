package com.openlap.analytics_module.services.impl;

import com.fasterxml.jackson.databind.*;
import com.openlap.analytics_module.drafts.IndicatorDraftConfiguration;
import com.openlap.analytics_module.dto.requests.indicator.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.services.ComplexIndicatorSourceGuard;
import com.openlap.infrastructure.exception.ValidationException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Validator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** The draft boundary reuses the same complete-definition validation as the existing editors. */
@Service
@RequiredArgsConstructor
public class IndicatorDraftDefinitionService {
  private final ObjectMapper mapper;
  private final Validator validator;
  private final IndicatorDraftConfiguration configurations;
  private final IndicatorBasicServiceImpl basic;
  private final IndicatorCompositeServiceImpl composite;
  private final IndicatorMultiLevelServiceImpl multiLevel;
  private final ComplexIndicatorSourceGuard sources;
  private final IndicatorUtilityServiceImpl utility;

  public Indicator prepare(HttpServletRequest request, IndicatorType type, JsonNode payload) {
    if (!payload.isObject() || payload.toString().length() > 2 * IndicatorDraftConfiguration.MAX_BYTES
        || !type.name().equals(payload.path("indicatorType").asText())
        || !payload.path("name").isTextual() || payload.path("name").asText().length() > 300) throw invalid();
    JsonNode clean = payload.deepCopy();
    try {
      JsonNode config = configurations.validate(mapper.readTree(payload.path("configuration").asText()), type, 1);
      ((com.fasterxml.jackson.databind.node.ObjectNode) clean).put("configuration", config.toString());
    } catch (Exception error) { throw invalid(); }
    IndicatorReference reference;
    switch (type) {
      case BASIC -> {
        IndicatorBasicRequest body = convert(clean, IndicatorBasicRequest.class);
        // Every selected store must be owned; the legacy bulk check accepts any matching store.
        for (var store : body.getIndicatorQuery().getLrsStores()) basic.validateUserRequest(request, List.of(store));
        reference = IndicatorBasicServiceImpl.getIndicatorReferenceForBasicIndicator(body);
      }
      case COMPOSITE -> {
        IndicatorCompositeRequest body = convert(clean, IndicatorCompositeRequest.class);
        sources.validate(request, body.getIndicators(), true);
        composite.validateSavedDefinition(body);
        reference = IndicatorCompositeServiceImpl.reference(body);
      }
      case MULTI_LEVEL -> {
        IndicatorMultiLevelRequest body = convert(clean, IndicatorMultiLevelRequest.class);
        sources.validate(request, body.getIndicators(), false);
        multiLevel.validateSavedDefinition(body);
        reference = IndicatorMultiLevelServiceImpl.reference(body);
      }
      default -> throw invalid();
    }
    return utility.prepareDraftCompletion(request, reference);
  }
  private <T> T convert(JsonNode node, Class<T> type) {
    final T result;
    try { result = mapper.treeToValue(node, type); } catch (Exception error) { throw invalid(); }
    var errors = validator.validate(result);
    if (!errors.isEmpty()) throw new ValidationException("INCOMPLETE_INDICATOR",
        "Complete the required indicator inputs before saving.",
        java.util.Map.of("fields", errors.stream().map(error -> error.getPropertyPath().toString()).sorted().toList()));
    return result;
  }
  private static ValidationException invalid() {
    return new ValidationException("INVALID_INDICATOR_DEFINITION", "The complete indicator definition is invalid. Review the editor before saving.");
  }
}
