import { useContext, useEffect } from "react";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "../../../basic-indicator";
import {
  fetchAnalyticsMethods,
  fetchTechniqueInputsAndParams,
} from "../utils/analysis-api";
import { Autocomplete, Stack, TextField, Typography } from "@mui/material";
import SectionCard from "../../../../../../../common/components/section-card/section-card";

export default function AnalysisSelection() {
  const { api } = useContext(AuthContext);
  const { analysis, setAnalysis } = useContext(BasicContext);

  useEffect(() => {
    const loadAnalyticsMethodsList = async () => {
      try {
        const analyticsMethodList = await fetchAnalyticsMethods(api);
        setAnalysis((p) => ({
          ...p,
          analyticsMethodList: analyticsMethodList || [],
          analyzedData: {},
        }));
      } catch (error) {
        console.error("Failed to fetch analysis methods:", error);
      }
    };
    if (Object.keys(analysis.analyzedData).length === 0)
      loadAnalyticsMethodsList();
  }, []);

  const handleSelectAnalyticsMethod = async (value) => {
    const methodId = value.id;

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

    try {
      const response = await fetchTechniqueInputsAndParams(api, methodId);
      const inputs = response.inputs;
      const params = response.params;

      // Assign default values to params
      const initializedParams = params.map((param) => ({
        ...param,
        value: param.defaultValue,
      }));

      // Update both inputs and params together
      setAnalysis((p) => ({ ...p, inputs, params: initializedParams }));
    } catch (error) {
      console.error("Error fetching method data:", error);
    }
  };

  return (
    <SectionCard
      title="Analytics method"
      helper="Choose the analysis to apply to your filtered data."
    >
      <Stack gap={0.75}>
        <Typography variant="body2" fontWeight={500}>
          Analytics method
        </Typography>
        <Autocomplete
          disableClearable
          disablePortal
          fullWidth
          options={analysis.analyticsMethodList}
          getOptionLabel={(o) => o.name}
          value={analysis.selectedAnalyticsMethod.method || null}
          onChange={(event, value) => handleSelectAnalyticsMethod(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search for an analytics method"
              inputProps={{
                ...params.inputProps,
                "aria-label": "Analytics method",
              }}
            />
          )}
          renderOption={(props, option) => {
            const { key, ...restProps } = props;
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
      </Stack>
    </SectionCard>
  );
}
