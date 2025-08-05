import { useContext, useEffect } from "react";
import {
  Autocomplete,
  Chip,
  Divider,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { fetchVisualizationLibrary } from "../utils/visualization-api.js";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { fetchVisualizationTypeByLibraryId } from "../utils/visualization-api.js";

const VisualizationLibrary = ({
  state,
  setState,
  visRef,
  setVisRef,
  setIndicator,
  setGenerate,
}) => {
  const { api } = useContext(AuthContext);
  useEffect(() => {
    const loadVisualizationLibraryData = async () => {
      try {
        return await fetchVisualizationLibrary(api);
      } catch (error) {
        console.log("Failed to load the Visualization library list");
      }
    };

    if (state.libraryList.length === 0) {
      loadVisualizationLibraryData().then((response) => {
        setState((prevState) => ({
          ...prevState,
          libraryList: response,
        }));
      });
    }
  }, [state.libraryList.length]);

  const handleSelectVisualizationLibrary = (value) => {
    setVisRef((prevState) => ({
      ...prevState,
      visualizationLibraryId: value.id,
    }));
    const loadVisualizationTypeData = async (libraryId) => {
      try {
        return await fetchVisualizationTypeByLibraryId(api, libraryId);
      } catch (error) {
        console.log("Failed to load the Visualization type list");
      }
    };
    loadVisualizationTypeData(value.id).then((response) => {
      setState((prevState) => ({
        ...prevState,
        typeList: response,
        autoCompleteValue: null,
        loadingPreview: false,
      }));
    });

    // setState((prevState) => ({
    //   ...prevState,
    //   typeList: [],
    //   autoCompleteValue: null,
    //   loadingPreview: false,
    // }));
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
      previewDisabled: true,
    }));
    setGenerate(false);
    setIndicator((prevState) => ({
      ...prevState,
      previewData: {
        ...prevState.previewData,
        displayCode: [],
        scriptData: "",
      },
    }));
  };

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Search for Visualization library
              </Typography>
            </Grid>
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
                  <TextField {...params} placeholder="*Visualization Library" />
                )}
                onChange={(event, value) => {
                  if (value) handleSelectVisualizationLibrary(value);
                }}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Selected <b>Visualization library</b>
              </Typography>
            </Grid>
            <Grid
              item
              xs={12}
              sx={{ mt: visRef.visualizationLibraryId.length > 0 ? 1 : 0 }}
            >
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
                            color="primary"
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
            <Grid
              item
              xs={12}
              sx={{ mt: visRef.visualizationLibraryId.length > 0 ? 0.5 : 5.5 }}
            >
              <Divider />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default VisualizationLibrary;
