import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "../../../basic-indicator";
import {
  fetchAnalyticsMethods,
  fetchTechniqueInputsAndParams,
} from "../utils/analysis-api";
import { Alert, Button, Stack, Typography } from "@mui/material";
import SectionCard from "../../../../../../../common/components/section-card/section-card";
import { AnalysisObservationGuidance } from "../../../../components/analysis-observation-guidance.jsx";
import AnalyticsMethodPicker from "../../../../components/analytics-method-picker.jsx";
import { withAnalysisInputDefaults } from "../utils/analysis-data.js";
import { methodDataRecommendation } from "../utils/method-availability.js";

export default function AnalysisSelection({ availability }) {
  const { api } = useContext(AuthContext);
  const { analysis, setAnalysis } = useContext(BasicContext);
  const methodId = analysis.selectedAnalyticsMethod.method.id;
  const [methodError, setMethodError] = useState("");
  const [retry, setRetry] = useState(0);
  const selectedMethod = analysis.analyticsMethodList.find((method) => method.id === methodId) ||
    analysis.selectedAnalyticsMethod.method;

  useEffect(() => {
    let cancelled = false;
    const loadAnalyticsMethodsList = async () => {
      try {
        const analyticsMethodList = await fetchAnalyticsMethods(api);
        if (cancelled) return;
        setAnalysis((previous) => {
          const selected = previous.selectedAnalyticsMethod;
          const method = analyticsMethodList?.find((entry) => entry.id === selected.method.id);
          return withAnalysisInputDefaults({
            ...previous,
            analyticsMethodList: analyticsMethodList || [],
            selectedAnalyticsMethod: method ? { ...selected, method } : selected,
          });
        });
      } catch (error) {
        console.error("Failed to fetch analysis methods:", error);
      }
    };
    loadAnalyticsMethodsList();
    return () => { cancelled = true; };
  }, [api, setAnalysis]);

  useEffect(() => {
    if (!methodId || analysis.inputs.length) return undefined;
    let cancelled = false;
    const controller = new AbortController();
    setMethodError("");
    fetchTechniqueInputsAndParams(api, methodId, { signal: controller.signal })
      .then((response) => {
        if (cancelled) return;
        setAnalysis((previous) => previous.selectedAnalyticsMethod.method.id !== methodId
          ? previous : withAnalysisInputDefaults({
            ...previous,
            inputs: response.inputs || [],
            params: (response.params || []).map((param) => ({
              ...param, value: previous.params.some((saved) => saved.id === param.id)
                ? previous.params.find((saved) => saved.id === param.id).value : param.defaultValue,
            })),
          }));
      })
      .catch(() => {
        if (!cancelled) setMethodError("Could not load method inputs and parameters. Your selection is preserved.");
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api, methodId, analysis.inputs.length, retry, setAnalysis]);

  const handleSelectAnalyticsMethod = (value) => {
    setAnalysis((p) => ({
      ...p,
      inputs: [],
      params: [],
      selectedAnalyticsMethod: {
        ...p.selectedAnalyticsMethod,
        method: value,
        mapping: { mapping: [] },
      },
      analyzedData: {},
    }));

  };

  return (
    <SectionCard
      title="Analytics method"
      helper="Choose the analysis to apply to your filtered data."
    >
      <Stack sx={{ gap: 0.75 }}>
        {availability?.loading && (
          <Typography variant="body2" color="text.secondary" role="status">
            Checking which method inputs are available with your filters…
          </Typography>
        )}
        {availability?.error && (
          <Alert severity="info" action={
            <Button color="inherit" size="small" onClick={availability.retry}>Retry data check</Button>
          }>
            Could not check data for method recommendations.
          </Alert>
        )}
        {availability?.data?.complete === false && (
          <Typography variant="body2" color="text.secondary" role="status">
            Recommendations use a sample of {availability.data.checkedStatements.toLocaleString()} matching statements.
            Other matching statements may contain more fields.
          </Typography>
        )}
        {availability && !availability.loading && !availability.error && !availability.data && (
          <Typography variant="body2" color="text.secondary">
            Complete your dataset and filters to get recommendations for your data.
          </Typography>
        )}
        <AnalyticsMethodPicker
          methods={analysis.analyticsMethodList}
          value={selectedMethod?.id ? selectedMethod : null}
          onChange={handleSelectAnalyticsMethod}
          recommendForData={(method) => methodDataRecommendation(method.basicInputRequirement, availability?.data, method.metadata?.requiredInputRoles)}
        />
        <AnalysisObservationGuidance inputs={analysis.inputs} />
        {methodError && (
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={() => setRetry((previous) => previous + 1)}>
              Retry
            </Button>
          }>
            {methodError}
          </Alert>
        )}
      </Stack>
    </SectionCard>
  );
}

AnalysisSelection.propTypes = {
  availability: PropTypes.shape({
    data: PropTypes.object,
    loading: PropTypes.bool,
    error: PropTypes.string,
    retry: PropTypes.func,
  }),
};
