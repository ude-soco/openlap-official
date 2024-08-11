import { useEffect, useContext } from "react";
import {
  Autocomplete,
  Chip,
  Divider,
  TextField,
  Grid,
  Typography,
} from "@mui/material";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import { IndicatorEditorContext } from "../../../../../indicator-editor";
import Tooltip from "@mui/material/Tooltip";
import { fetchAnalyticsTechnique } from "../utils/analytics-api";

const AnalyticsTechnique = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { indicatorQuery, lockedStep, analysisRef, setAnalysisRef } =
    useContext(IndicatorEditorContext);

  useEffect(() => {
    const loadAnalyticsTechniqueData = async () => {
      try {
        const analyticsTechniqueListResponse = await fetchAnalyticsTechnique(
          api
        );
        setState((prevState) => ({
          ...prevState,
          techniqueList: analyticsTechniqueListResponse,
        }));
      } catch (error) {
        console.log("Failed to load the Analytics Technique list");
      }
    };

    if (state.techniqueList.length === 0) {
      loadAnalyticsTechniqueData();
    }
  }, [state.techniqueList.length]);

  const handleSelectTechnique = (value) => {
    setAnalysisRef((prevState) => ({
      ...prevState,
      analyticsTechniqueId: value.id,
    }));
    setState((prevState) => ({
      ...prevState,
      autoCompleteValue: null,
    }));
  };

  const handleDeselectTechnique = () => {
    setAnalysisRef((prevState) => {
      return {
        ...prevState,
        analyticsTechniqueId: "",
        analyticsTechniqueParams: [],
        analyticsTechniqueMapping: {
          mapping: [],
        },
        analyzedData: {},
      };
    });
    setState((prevState) => ({
      ...prevState,
      previewDisabled: true,
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Autocomplete
            disabled={analysisRef.analyticsTechniqueId !== ""}
            disablePortal
            id="combo-box-lrs"
            options={state.techniqueList}
            fullWidth
            value={state.autoCompleteValue}
            getOptionLabel={(option) => option.name}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Grid container sx={{ py: 0.5 }}>
                  <Grid item xs={12}>
                    <Typography>{option.name}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                      {option.description}
                    </Typography>
                  </Grid>
                </Grid>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="*Search for an Analytics technique"
              />
            )}
            onChange={(event, value) => {
              if (value) handleSelectTechnique(value);
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography>Selected Analytics technique</Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                <Grid item>
                  {state.techniqueList?.map((technique) => {
                    if (technique.id === analysisRef.analyticsTechniqueId) {
                      return (
                        <Tooltip
                          key={technique.id}
                          arrow
                          title={
                            <Typography>{technique.description}</Typography>
                          }
                        >
                          <Chip
                            label={technique.name}
                            onDelete={handleDeselectTechnique}
                          />
                        </Tooltip>
                      );
                    }
                    return undefined;
                  })}
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} sx={{ pb: 2 }}>
              <Divider />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default AnalyticsTechnique;
