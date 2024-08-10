import { useEffect, useState, useContext } from "react";
import {
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionActions,
  Chip,
  Button,
  Divider,
  TextField,
  Grid,
  Typography,
  Paper,
} from "@mui/material";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import { SelectionContext } from "../../../selection-panel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import {
  fetchAnalyticsTechnique,
  fetchTechniqueInputs,
  fetchTechniqueParams,
} from "../utils/analytics-api";

const AnalyticsTechnique = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { indicatorQuery, lockedStep, analysisRef, setAnalysisRef } =
    useContext(SelectionContext);

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
        console.log("Failed to load the Analytics Technique list", error);
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

    const loadTechniqueInputs = async (value) => {
      try {
        const techniqueInputsList = await fetchTechniqueInputs(api, value.id);
        setState((prevState) => ({
          ...prevState,
          inputs: techniqueInputsList,
        }));
      } catch (error) {
        console.log("Error fetching Analytics technique input list");
      }
    };
    const loadTechniqueParams = async (value) => {
      try {
        const techniqueParamsList = await fetchTechniqueParams(api, value.id);
        techniqueParamsList.forEach(
          (param) => (param.value = param.defaultValue)
        );
        setAnalysisRef((prevState) => ({
          ...prevState,
          analyticsTechniqueParams: techniqueParamsList,
        }));
      } catch (error) {
        console.log("Error fetching Analytics technique input list");
      }
    };

    loadTechniqueInputs(value);
    loadTechniqueParams(value);
  };

  const handleDeselectTechnique = (value) => {
    setAnalysisRef((prevState) => {
      return {
        ...prevState,
        analyticsTechniqueId: "",
      };
    });
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Autocomplete
            disablePortal
            id="combo-box-lrs"
            options={state.techniqueList}
            fullWidth
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
                    if (technique.id === analysisRef.analyticsTechniqueId)
                      return (
                        <>
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
                        </>
                      );
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
