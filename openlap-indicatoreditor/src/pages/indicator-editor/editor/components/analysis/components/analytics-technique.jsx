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
import { fetchAnalyticsTechnique } from "../utils/analytics-api.js";

const AnalyticsTechnique = ({
  state,
  setState,
  analysisRef,
  setAnalysisRef,
  setLockedStep,
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
    setLockedStep((prevState) => ({
      ...prevState,
      visualization: {
        locked: true,
        openPanel: false,
      },
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
            renderOption={(props, option) => {
              const { key, ...restProps } = props;
              return (
                <li {...restProps} key={key}>
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
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="*Search for an analytics technique"
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
              <Typography>Selected analytics technique</Typography>
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
