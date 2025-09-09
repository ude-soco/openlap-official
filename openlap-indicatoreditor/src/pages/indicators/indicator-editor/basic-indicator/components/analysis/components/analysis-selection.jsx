import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "../../../basic-indicator";
import {
  fetchAnalyticsMethods,
  fetchTechniqueInputs,
  fetchTechniqueParams,
} from "../utils/analysis-api";
import { Autocomplete, Grid, TextField, Typography } from "@mui/material";
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
    }));

    try {
      const [inputs, params] = await Promise.all([
        fetchTechniqueInputs(api, methodId),
        fetchTechniqueParams(api, methodId),
      ]);

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
      <Grid container>
        <Grid size={{ xs: 12 }}>
          <Grid container alignItems="center">
            <Typography>
              Select an <b>Analytics Method</b>
            </Typography>
            <CustomTooltip
              type="description"
              message={`Select the type of analysis to apply to your data.`}
            />
          </Grid>
        </Grid>
        <Grid size={{ xs: 12 }}>
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
                placeholder="Search for Analytics Methods"
              />
            )}
            renderOption={(props, option) => {
              const { key, ...restProps } = props;
              return (
                <li {...restProps} key={option.id}>
                  <Grid container sx={{ py: 0.5 }}>
                    <Grid size={{ xs: 12 }}>
                      <Typography>{option.name}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2">
                        {option.description}
                      </Typography>
                    </Grid>
                  </Grid>
                </li>
              );
            }}
          />
        </Grid>
      </Grid>
    </>
  );
}
