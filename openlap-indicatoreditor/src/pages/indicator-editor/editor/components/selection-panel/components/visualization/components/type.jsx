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
import { fetchVisualizationTypeByLibraryId } from "../utils/visualization-api";

const VisualizationType = ({ state, setState }) => {
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
    const loadVisualizationTypeData = async (libraryId) => {
      console.log(libraryId);
      try {
        const typeListResponse = await fetchVisualizationTypeByLibraryId(
          api,
          libraryId
        );
        setState((prevState) => ({
          ...prevState,
          typeList: typeListResponse,
        }));
      } catch (error) {
        console.log("Failed to load the Visualization type list");
      }
    };

    if (state.typeList.length === 0) {
      loadVisualizationTypeData(visRef.visualizationLibraryId);
    }
  }, [state.typeList.length]);

  const handleSelectVisualizationType = (value) => {
    setVisRef((prevState) => ({
      ...prevState,
      visualizationTypeId: value.id,
    }));
  };

  const handleDeselectVisualizationType = () => {
    setVisRef((prevState) => {
      return {
        ...prevState,
        visualizationTypeId: "",
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
            options={state.typeList}
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
                placeholder="*Search for an Visualization type"
              />
            )}
            onChange={(event, value) => {
              if (value) handleSelectVisualizationType(value);
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
                  {state.typeList?.map((type) => {
                    if (type.id === visRef.visualizationTypeId) {
                      return (
                        <Tooltip
                          key={type.id}
                          arrow
                          title={<Typography>{type.description}</Typography>}
                        >
                          <Chip
                            label={type.name}
                            onDelete={handleDeselectVisualizationType}
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

export default VisualizationType;
