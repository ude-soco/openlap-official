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
    setState((prevState) => ({
      ...prevState,
      typeList: [],
      autoCompleteValue: null,
    }));
  };

  const handleDeselectVisualizationLibrary = () => {
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
    setState((prevState) => ({
      ...prevState,
      typeList: [],
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Autocomplete
            disabled={visRef.visualizationLibraryId !== ""}
            disablePortal
            id="combo-box-lrs"
            options={state.libraryList.sort((a, b) =>
              a.name.localeCompare(b.name)
            )}
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
                  {state.libraryList?.map((library) => {
                    if (library.id === visRef.visualizationLibraryId) {
                      return (
                        <Tooltip
                          key={library.id}
                          arrow
                          title={<Typography>{library.description}</Typography>}
                        >
                          <Chip
                            label={library.name}
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
