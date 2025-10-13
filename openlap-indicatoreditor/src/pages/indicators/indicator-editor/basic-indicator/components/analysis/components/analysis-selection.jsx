import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "../../../basic-indicator";
import {
  fetchAnalyticsMethods,
  fetchTechniqueInputs,
  fetchTechniqueInputsAndParams,
  fetchTechniqueParams,
} from "../utils/analysis-api";
import { Autocomplete, Stack, TextField, Typography } from "@mui/material";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";

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
    <>
      <Stack>
        <Stack direction="row" alignItems="center">
          <Typography>
            Select an <b>Analytics Method</b>
          </Typography>
          <CustomTooltip
            type="description"
            message={`Select the type of analysis to apply to your data.`}
          />
        </Stack>
        <Autocomplete
          disableClearable
          disablePortal
          fullWidth
          options={analysis.analyticsMethodList}
          getOptionLabel={(o) => o.name}
          value={analysis.selectedAnalyticsMethod.method || null}
          onChange={(event, value) => handleSelectAnalyticsMethod(value)}
          renderInput={(params) => (
            <TextField {...params} placeholder="Search for Analytics Methods" />
          )}
          renderOption={(props, option) => {
            const { key, ...restProps } = props;
            return (
              <li {...restProps} key={option.id}>
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
    </>
  );
}
