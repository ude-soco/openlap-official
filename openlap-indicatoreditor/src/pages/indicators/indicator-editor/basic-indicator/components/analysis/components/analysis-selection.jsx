import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "../../../basic-indicator";
import {
  fetchAnalyticsMethods,
  fetchTechniqueInputs,
  fetchTechniqueParams,
} from "../utils/analysis-api";
import { Autocomplete, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";

export default function AnalysisSelection() {
  const { api } = useContext(AuthContext);
  const { analysis, setAnalysis } = useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: null,
    tipDescription: `
        <b>Tip!</b><br/>
        To be decided!.
      `,
  });

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

  const handleTipAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

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
      <Typography gutterBottom>
        Select an <b>Analytics Method</b>
      </Typography>
      <Grid container spacing={1} alignItems="center">
        <Grid size="grow">
          <Autocomplete
            disableClearable
            disablePortal
            fullWidth
            options={analysis.analyticsMethodList}
            getOptionLabel={(o) => o.name}
            value={analysis.selectedAnalyticsMethod.method || null}
            onChange={(event, value) => handleSelectAnalyticsMethod(value)}
            renderInput={(params) => (
              <TextField {...params} placeholder="List of Analytics Methods" />
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
        <Grid size="auto">
          <TipPopover
            tipAnchor={state.tipAnchor}
            toggleTipAnchor={handleTipAnchor}
            description={state.tipDescription}
          />
        </Grid>
      </Grid>
    </>
  );
}
