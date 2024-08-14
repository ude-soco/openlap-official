import { useContext, useEffect } from "react";
import { Box, Divider, Grid, ToggleButton, Typography } from "@mui/material";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import { fetchVisualizationTypeByLibraryId } from "../utils/visualization-api.js";
import images from "../config/images.js";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";

const VisualizationType = ({ state, setState, visRef, setVisRef }) => {
  const { darkMode } = useContext(CustomThemeContext);
  const { api } = useContext(AuthContext);

  useEffect(() => {
    const loadVisualizationTypeData = async (libraryId) => {
      try {
        return await fetchVisualizationTypeByLibraryId(api, libraryId);
      } catch (error) {
        console.log("Failed to load the Visualization type list");
      }
    };

    if (state.typeList.length === 0) {
      loadVisualizationTypeData(visRef.visualizationLibraryId).then(
        (response) => {
          setState((prevState) => ({
            ...prevState,
            typeList: response,
          }));
        },
      );
    }
  }, [state.typeList.length]);

  const handleSelectVisualizationType = (value) => {
    setVisRef((prevState) => ({
      ...prevState,
      visualizationTypeId: value.id,
      visualizationMapping: {
        ...prevState.visualizationMapping,
        mapping: [],
      },
    }));
    setState((prevState) => ({
      ...prevState,
      previewDisabled: false,
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid item xs={12}>
            <Typography>Available chart types</Typography>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={3} justifyContent="center">
            {state.typeList
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((type) => {
                let imgUrl = images.find(
                  (image) => image.imageCode === type.imageCode,
                );
                return (
                  <Grid item key={type.id}>
                    <ToggleButton
                      sx={{ height: 72, width: 72, mb: 1 }}
                      value={type}
                      color={
                        type.id === visRef.visualizationTypeId
                          ? "primary"
                          : undefined
                      }
                      selected={type.id === visRef.visualizationTypeId}
                      onClick={() => handleSelectVisualizationType(type)}
                    >
                      <Box
                        component="img"
                        src={imgUrl.image}
                        alt={imgUrl.imageCode}
                        sx={{
                          width: "80%",
                          height: "80%",
                          filter: darkMode ? "invert(1)" : undefined,
                        }}
                      />
                    </ToggleButton>

                    <Typography
                      variant="body2"
                      sx={{ width: 72 }}
                      color={
                        type.id === visRef.visualizationTypeId
                          ? "primary"
                          : undefined
                      }
                      align="center"
                    >
                      {type.name}
                    </Typography>
                  </Grid>
                );
              })}
          </Grid>
        </Grid>
        <Grid item xs={12} sx={{ pb: 2 }}>
          <Divider />
        </Grid>
      </Grid>
    </>
  );
};

export default VisualizationType;
