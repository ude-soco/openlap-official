import { useContext, useEffect } from "react";
import {
  Autocomplete,
  Chip,
  Divider,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import Tooltip from "@mui/material/Tooltip";
import {
  fetchAnalyticsTechnique,
  fetchTechniqueInputs,
  fetchTechniqueParams,
} from "../utils/analytics-api.js";

const AnalyticsTechnique = ({
  state,
  setState,
  analysisRef,
  setAnalysisRef,
  setLockedStep,
  setGenerate,
  setIndicator,
  setVisRef,
}) => {
  const { api } = useContext(AuthContext);

  useEffect(() => {
    const loadAnalyticsTechniqueData = async () => {
      try {
        return await fetchAnalyticsTechnique(api);
      } catch (error) {
        throw error;
      }
    };

    if (state.techniqueList.length === 0) {
      loadAnalyticsTechniqueData()
        .then((response) => {
          setState((prevState) => ({
            ...prevState,
            techniqueList: response,
          }));
        })
        .catch((error) => {
          console.log("Failed to load the Analytics Technique list", error);
        });
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
    const loadTechniqueInputs = async (value) => {
      try {
        return await fetchTechniqueInputs(api, value);
      } catch (error) {
        throw error;
      }
    };
    const loadTechniqueParams = async (techniqueId) => {
      try {
        return await fetchTechniqueParams(api, techniqueId);
      } catch (error) {
        throw error;
      }
    };
    loadTechniqueInputs(value.id)
      .then((response) => {
        setState((prevState) => ({
          ...prevState,
          inputs: response,
        }));
      })
      .then(() => {
        loadTechniqueParams(value.id)
          .then((response) => {
            response.forEach((param) => (param.value = param.defaultValue));
            setAnalysisRef((prevState) => ({
              ...prevState,
              analyticsTechniqueParams: response,
            }));
            setState((prevState) => ({
              ...prevState,
              parameters: response,
            }));
          })
          .catch((error) => {
            console.log("Error fetching Analytics technique input list", error);
          });
      })
      .catch((error) => {
        console.log("Error fetching Analytics technique input list", error);
      });
  };

  const handleDeselectTechnique = () => {
    setVisRef((prevState) => {
      return {
        ...prevState,
        visualizationLibraryId: "",
        visualizationTypeId: "",
        visualizationMapping: {
          ...prevState.visualizationMapping,
          mapping: [],
        },
      };
    });
    setGenerate(false);
    setIndicator((prevState) => ({
      ...prevState,
      previewData: {
        ...prevState.previewData,
        displayCode: [],
        scriptData: "",
      },
    }));
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
      inputs: [],
      parameters: [],
      previewDisabled: true,
    }));
    setLockedStep((prevState) => ({
      ...prevState,
      visualization: {
        locked: true,
        openPanel: false,
      },
      finalize: {
        ...prevState.finalize,
        locked: true,
        openPanel: false,
      },
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Search for Analytics Method
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                disabled={analysisRef.analyticsTechniqueId !== ""}
                disablePortal
                id="combo-box-lrs"
                options={state.techniqueList}
                fullWidth
                slotProps={{
                  listbox: {
                    style: {
                      maxHeight: "240px",
                    },
                  },
                }}
                value={state.autoCompleteValue}
                getOptionLabel={(option) => option.name}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  return (
                    <li {...restProps} key={key}>
                      <Grid container sx={{ py: 0.5 }}>
                        <Grid item xs={12}>
                          <Typography>{option.name}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography
                            variant="body2"
                            sx={{ fontStyle: "italic" }}
                          >
                            {option.description}
                          </Typography>
                        </Grid>
                      </Grid>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="*Analytics Method" />
                )}
                onChange={(event, value) => {
                  if (value) handleSelectTechnique(value);
                }}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Selected <b>Analytics Method</b>
              </Typography>
            </Grid>
            <Grid
              item
              xs={12}
              sx={{ mt: analysisRef.analyticsTechniqueId.length > 0 ? 0.5 : 0 }}
            >
              <Grid container spacing={1}>
                {state.techniqueList?.map((technique) => {
                  if (technique.id === analysisRef.analyticsTechniqueId) {
                    return (
                      <Grid item key={technique.id}>
                        <Tooltip
                          arrow
                          title={
                            <Typography>{technique.description}</Typography>
                          }
                        >
                          <Chip
                            color="primary"
                            label={technique.name}
                            onDelete={handleDeselectTechnique}
                          />
                        </Tooltip>
                      </Grid>
                    );
                  }
                  return undefined;
                })}
              </Grid>
            </Grid>
            <Grid
              item
              xs={12}
              sx={{ mt: analysisRef.analyticsTechniqueId.length > 0 ? 0.5 : 5 }}
            >
              <Divider />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default AnalyticsTechnique;
