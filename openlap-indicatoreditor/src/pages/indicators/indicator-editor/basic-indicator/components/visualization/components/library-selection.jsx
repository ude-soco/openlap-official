import { useContext, useEffect } from "react";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { Autocomplete, Stack, TextField, Typography } from "@mui/material";
import {
  fetchVisualizationLibrary,
  fetchVisualizationTypeByLibraryId,
} from "../utils/visualization-api";
import { BasicContext } from "../../../basic-indicator";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";

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
      <Stack gap={1}>
        <Stack direction="row" alignItems="center">
          <Typography>
            Select a <b>Visualization library</b>
          </Typography>
          <CustomTooltip type="description" message={`To be decided`} />
        </Stack>
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
              placeholder="Search for Visualization libraries"
            />
          )}
          renderOption={(props, option) => {
            const { key, ...restProps } = props;
            return (
              <li {...restProps} key={option.id}>
                <Stack sx={{ py: 0.5 }}>
                  <Typography>{option.name}</Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ fontStyle: "italic" }}
                  >
                    {option.description}
                  </Typography>
                </Stack>
              </li>
            );
          }}
        />
      </Stack>
    </>
  );
}
