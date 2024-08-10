import { useEffect, useState, useContext } from "react";
import {
  Autocomplete,
  Chip,
  Divider,
  TextField,
  Grid,
  Typography,
} from "@mui/material";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import { SelectionContext } from "../../../selection-panel";
import Tooltip from "@mui/material/Tooltip";
import { fetchVisualizationLibrary } from "../utils/visualization-api";

const VisualizationLibrary = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const {
    indicatorQuery,
    lockedStep,
    analysisRef,
    setAnalysisRef,
    visRef,
    setVisRef,
  } = useContext(SelectionContext);

  useEffect(() => {
    const loadVisualizationLibraryData = async () => {
      try {
        const visLibraryListResponse = await fetchVisualizationLibrary(api);
        setState((prevState) => ({
          ...prevState,
          libraryList: visLibraryListResponse,
        }));
      } catch (error) {
        console.log("Failed to load the Visualization library list");
      }
    };

    if (state.libraryList.length === 0) {
      loadVisualizationLibraryData();
    }
  }, [state.libraryList.length]);

  const handleSelectVisualizationLibrary = (value) => {
    setVisRef((prevState) => ({
      ...prevState,
      visualizationLibraryId: value.id,
    }));
  };

  const handleDeselectVisualizationLibrary = () => {
    setAnalysisRef((prevState) => {
      return {
        ...prevState,
        visualizationLibraryId: "",
        visualizationTypeId: [],
        visualizationMapping: {
          mappings: [],
        },
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
            options={state.libraryList}
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
                placeholder="*Search for an Visualization library"
              />
            )}
            onChange={(event, value) => {
              if (value) handleSelectVisualizationLibrary(value);
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography>Selected Visualization library</Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                <Grid item>
                  {state.libraryList?.map((technique) => {
                    if (technique.id === visRef.visualizationLibraryId) {
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
                            onDelete={handleDeselectVisualizationLibrary}
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

export default VisualizationLibrary;
