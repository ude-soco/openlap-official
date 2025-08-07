import { useContext } from "react";
import { Box, Paper, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import RecommendIcon from "@mui/icons-material/Recommend";
import { BasicContext } from "../../../basic-indicator";
import { visualizationImages } from "../utils/visualization-data";
import { fetchVisualizationTypeInputs } from "../utils/visualization-api";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";

const TypeSelection = () => {
  const { api } = useContext(AuthContext);
  const { analysis, visualization, setVisualization } =
    useContext(BasicContext);

  const handleSelectVisualizationType = async (typeSelected) => {
    setVisualization((p) => ({ ...p, selectedType: typeSelected }));
    try {
      const typeInputs = await fetchVisualizationTypeInputs(
        api,
        typeSelected.id
      );
      setVisualization((p) => ({ ...p, inputs: typeInputs }));
    } catch (error) {
      console.error("Failed to get the chart inputs", error);
    }
  };

  // * Helper function
  function isChartRecommended(chartInputs, analyzedData) {
    // Step 1: Count required input types from the chart
    const requiredTypeCount = {};
    for (const input of chartInputs) {
      if (!input.required) continue;
      requiredTypeCount[input.type] = (requiredTypeCount[input.type] || 0) + 1;
    }

    // Step 2: Count available input types in analyzedData
    const availableTypeCount = {};
    for (const key in analyzedData) {
      const type = analyzedData[key].configurationData.type;
      availableTypeCount[type] = (availableTypeCount[type] || 0) + 1;
    }

    // Step 3: Ensure available counts meet or exceed required counts
    for (const type in requiredTypeCount) {
      if (
        !availableTypeCount[type] ||
        availableTypeCount[type] < requiredTypeCount[type]
      ) {
        return false; // Not enough inputs of this type
      }
    }

    return true; // All required types satisfied
  }

  return (
    <>
      <Typography gutterBottom>
        Available <b>Charts</b>
      </Typography>
      <Grid container spacing={2}>
        {visualization.typeList.flatMap((type, index) =>
          Object.entries(visualizationImages)
            .filter(([name]) => type.imageCode === name)
            .map(([name, svg]) => (
              <Grid
                key={`${type.imageCode}-${name}-${index}`}
                container
                component={Paper}
                variant="outlined"
                justifyContent="center"
                size={{ xs: 6, sm: 4, md: 3 }}
                sx={{
                  p: 2,
                  cursor: "pointer",
                  "&:hover": { boxShadow: 2 },
                  border:
                    visualization.selectedType.id === type.id
                      ? "2px solid #F57C00"
                      : "",
                }}
                onClick={() => handleSelectVisualizationType(type)}
              >
                <Box
                  component="div"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                <Grid size={{ xs: 12 }}>
                  <Grid
                    container
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {isChartRecommended(
                      type.chartInputs,
                      analysis.analyzedData
                    ) ? (
                      <RecommendIcon color="success" />
                    ) : undefined}
                    <Typography>{type.name}</Typography>
                  </Grid>
                </Grid>
              </Grid>
            ))
        )}
      </Grid>
      {isChartRecommended(
        visualization.selectedType.chartInputs,
        analysis.analyzedData
      ) ? (
        <Grid container justifyContent="center" spacing={1} sx={{pt: 2}}>
          <RecommendIcon color="success" />
          <Typography>
            Recommendation of charts are based on your analyzed data
          </Typography>
        </Grid>
      ) : undefined}
    </>
  );
};

export default TypeSelection;
