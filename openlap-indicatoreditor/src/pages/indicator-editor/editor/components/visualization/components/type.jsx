import { useContext } from "react";
import { Box, Grid, ToggleButton, Typography } from "@mui/material";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import { fetchVisualizationTypeInputs } from "../utils/visualization-api.js";
import images from "../config/images.js";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";

const VisualizationType = ({
  state,
  setState,
  visRef,
  setVisRef,
  setIndicator,
  setGenerate,
  setChartConfiguration,
}) => {
  const { darkMode } = useContext(CustomThemeContext);
  const { api } = useContext(AuthContext);

  const handleSelectVisualizationType = (value) => {
    setChartConfiguration(value.chartConfiguration);
    setState((prevState) => ({
      ...prevState,
      inputs: [],
      previewDisabled: true,
    }));
    const loadVisTypeInputs = async (typeId) => {
      try {
        return await fetchVisualizationTypeInputs(api, typeId);
      } catch (error) {
        console.log("Error fetching visualization library input list");
      }
    };
    loadVisTypeInputs(value.id).then((response) => {
      setState((prevState) => ({
        ...prevState,
        inputs: response,
        previewDisabled: false,
      }));
    });
    setVisRef((prevState) => ({
      ...prevState,
      visualizationTypeId: value.id,
      visualizationMapping: {
        ...prevState.visualizationMapping,
        mapping: [],
      },
    }));

    setIndicator((prevState) => ({
      ...prevState,
      previewData: {
        ...prevState.previewData,
        displayCode: [],
        scriptData: "",
      },
    }));

    setGenerate(false);
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Available <b>Visualization types</b>
            </Typography>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={3} justifyContent="center">
            {state.typeList
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((type) => {
                let imgUrl = images.find(
                  (image) => image.imageCode === type.imageCode
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
                        loading="lazy"
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
      </Grid>
    </>
  );
};

export default VisualizationType;
