import { useContext, useEffect } from "react";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { Autocomplete, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
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
    loadVisualizationLibraryList().then((libraryList) => {
      setVisualization((p) => ({ ...p, libraryList: libraryList }));
    });
  }, []);

  const handleSelectVisualizationLibrary = async (value) => {
    setVisualization((p) => ({ ...p, selectedLibrary: value }));
    try {
      const typeList = await fetchVisualizationTypeByLibraryId(api, value.id);
      setVisualization((p) => ({ ...p, typeList: typeList }));
    } catch (error) {
      console.error("Failed to load the visualization types", error);
    }
  };

  return (
    <>
      <Typography gutterBottom>
        Select a <b>Visualization library</b>
      </Typography>
      <Grid container spacing={1} alignItems="center">
        <Grid size="grow">
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
