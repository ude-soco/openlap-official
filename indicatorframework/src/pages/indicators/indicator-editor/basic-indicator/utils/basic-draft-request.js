import { restoreBasicState, serializeBasicDraft } from "./basic-draft-model.js";
import { buildAnalysisRef, buildIndicatorQuery, buildVisRef } from "./query-builder.js";

export function buildBasicDraftIndicatorRequest(configuration, name) {
  const state = restoreBasicState(configuration);
  state.indicator.indicatorName = name || state.indicator.indicatorName;
  return {
    name: state.indicator.indicatorName, indicatorType: "BASIC",
    indicatorQuery: buildIndicatorQuery(state.dataset, state.filters, state.analysis),
    ...buildAnalysisRef(state.analysis), ...buildVisRef(state.visualization),
    configuration: JSON.stringify(serializeBasicDraft(state)),
  };
}
