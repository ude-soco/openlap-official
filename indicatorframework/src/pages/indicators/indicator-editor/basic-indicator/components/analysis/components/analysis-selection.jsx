import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "../../../basic-indicator";
import {
  fetchAnalyticsMethods,
  fetchTechniqueInputsAndParams,
} from "../utils/analysis-api";
import { Alert, Autocomplete, Button, createFilterOptions, Stack, TextField, Typography } from "@mui/material";
import SectionCard from "../../../../../../../common/components/section-card/section-card";
import { AnalysisObservationGuidance } from "../../../../components/analysis-observation-guidance.jsx";
import { withAnalysisInputDefaults } from "../utils/analysis-data.js";

const filterMethods = createFilterOptions({ stringify: (method) => `${method.name} ${method.description || ""}` });

export default function AnalysisSelection() {
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
        setAnalysis((p) => ({
          ...p,
          analyticsMethodList: analyticsMethodList || [],
        }));
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
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Analytics method
        </Typography>
        <Autocomplete
          disableClearable
          disablePortal
          fullWidth
          options={analysis.analyticsMethodList}
          filterOptions={filterMethods}
          getOptionLabel={(o) => o.name}
          getOptionKey={(option) => option.id}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={selectedMethod?.id ? selectedMethod : null}
          onChange={(event, value) => handleSelectAnalyticsMethod(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search for an analytics method"
              slotProps={{
                ...params.slotProps,
                htmlInput: {
                  ...params.slotProps.htmlInput,
                  "aria-label": "Analytics method",
                },
              }}
            />
          )}
          renderOption={(attributes, option) => {
            const { key, ...restProps } = attributes;
            return (
              <li key={key} {...restProps}>
                <Stack sx={{ py: 0.5 }}>
                  <Typography>{option.name}</Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ fontStyle: "italic" }}
                  >
                    {option.description}
                  </Typography>
                </Stack>
              </li>
            );
          }}
        />
        {selectedMethod?.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {selectedMethod.description}
          </Typography>
        )}
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
