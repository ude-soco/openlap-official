import { useContext, useEffect } from "react";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import {
  Autocomplete,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import InfoIcon from "@mui/icons-material/Info";
import {
  fetchVisualizationLibrary,
  fetchVisualizationTypeByLibraryId,
} from "../utils/visualization-api";
import { BasicContext } from "../../../basic-indicator";

export default function LibrarySelection() {
  const { api } = useContext(AuthContext);
  const { visualization, setVisualization } = useContext(BasicContext);

  useEffect(() => {
    const loadVisualizationLibraryList = async () => {
      try {
        return await fetchVisualizationLibrary(api);
      } catch (error) {
        console.log("Failed to request visualization library list");
      }
    };
    if (visualization.libraryList.length === 0) {
      loadVisualizationLibraryList().then((libraryList) => {
        // * Setting it to default if the library list is empty
        setVisualization((p) => ({
          ...p,
          libraryList: libraryList,
          selectedLibrary: { name: "" },
          typeList: [],
          selectedType: { name: "", chartInputs: [] },
          inputs: [],
          params: { height: 500, width: 500 },
          mapping: { mapping: [] },
          previewData: { displayCode: [], scriptData: {} },
        }));
      });
    }
  }, []);

  const handleSelectVisualizationLibrary = async (value) => {
    // * If the user changes the library, all the settings sets to default
    // TODO: A warning message next to the dropdown is needed if the user has generated a visualization
    setVisualization((p) => ({
      ...p,
      selectedLibrary: value,
      typeList: [],
      selectedType: { name: "", chartInputs: [] },
      inputs: [],
      params: { height: 500, width: 500 },
      mapping: { mapping: [] },
      previewData: { displayCode: [], scriptData: {} },
    }));
    try {
      const typeList = await fetchVisualizationTypeByLibraryId(api, value.id);
      setVisualization((p) => ({ ...p, typeList: typeList }));
    } catch (error) {
      console.error("Failed to load the visualization types", error);
    }
  };

  return (
    <>
      <Grid container>
        <Grid size={{ xs: 12 }}>
          <Grid container alignItems="center">
            <Typography>
              Select a <b>Visualization library</b>
            </Typography>
            <Tooltip
              arrow
              title={
                <Typography sx={{ p: 1 }}>
                  <b>Description</b>
                  <br />
                  To be decided
                </Typography>
              }
            >
              <IconButton color="info">
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Autocomplete
            disableClearable
            disablePortal
            fullWidth
            options={visualization.libraryList || []}
            getOptionLabel={(o) => o.name}
            value={visualization.selectedLibrary || null}
            onChange={(event, value) => handleSelectVisualizationLibrary(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="List of Visualization Libraries"
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
