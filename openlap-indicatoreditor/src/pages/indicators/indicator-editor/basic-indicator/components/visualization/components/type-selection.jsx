import { useContext, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Grid,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RecommendIcon from "@mui/icons-material/Recommend";
import { BasicContext } from "../../../basic-indicator";
import { visualizationImages } from "../utils/visualization-data";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";
import { defaultParams } from "../utils/visualization-data";

const TypeSelection = () => {
  const { analysis, visualization, setVisualization } =
    useContext(BasicContext);
  const [state, setState] = useState({ showTypeSelection: false });

  const handleSelectVisualizationType = async (typeSelected) => {
    setVisualization((p) => ({
      ...p,
      selectedType: typeSelected,
      inputs: [...typeSelected.chartInputs],
      params: { ...defaultParams },
      mapping: { mapping: [] },
      previewData: { displayCode: [], scriptData: {} },
    }));
  };

  const handleShowSelected = (expanded) => {
    setState((p) => ({ ...p, showTypeSelection: !expanded }));
  };

  // * Helper function
  function isChartRecommended(chartInputs, analyzedData) {
    const requiredTypeCount = {};
    for (const input of chartInputs) {
      if (!input.required) continue;
      requiredTypeCount[input.type] = (requiredTypeCount[input.type] || 0) + 1;
    }

    if (Object.keys(requiredTypeCount).length === 0) return false;

    const availableTypeCount = {};
    for (const key in analyzedData) {
      const type = analyzedData[key].configurationData.type;
      availableTypeCount[type] = (availableTypeCount[type] || 0) + 1;
    }

    for (const type in requiredTypeCount) {
      if (
        !availableTypeCount[type] ||
        availableTypeCount[type] < requiredTypeCount[type]
      ) {
        return false;
      }
    }

    return true;
  }

  function determineType(type) {
    if (type === "Text") return "Categorical";
    if (type === "Numeric") return "Numerical";
  }

  return (
    <Stack gap={2}>
      <Stack direction="row" alignItems="center">
        <Typography>
          Available <b>Charts</b>
        </Typography>
        <CustomTooltip type="description" message={`To be decided`} />
      </Stack>
      <Grid container spacing={2} justifyContent="center">
        {visualization.typeList.flatMap((type, index) =>
          Object.entries(visualizationImages)
            .filter(([name]) => type.imageCode === name)
            .map(([name, svg]) => {
              const isRecommended = isChartRecommended(
                type.chartInputs,
                analysis.analyzedData
              );

              const cardContent = (
                <Stack gap={2} alignItems="center" justifyContent="center">
                  <Box sx={{ position: "relative" }}>
                    <Box
                      component="div"
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                    {isRecommended && (
                      <RecommendIcon
                        color="success"
                        sx={{
                          borderRadius: 50,
                          bgcolor: "white",
                          position: "absolute",
                          top: -4,
                          right: -8,
                        }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" align="center">
                    {type.name}
                  </Typography>
                </Stack>
              );
              return (
                <Grid
                  key={`${type.imageCode}-${name}-${index}`}
                  container
                  component={Paper}
                  variant="outlined"
                  justifyContent="center"
                  size={{ xs: 6, sm: 3, lg: 2 }}
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    "&:hover": { boxShadow: 2 },
                    border:
                      visualization.selectedType.id === type.id
                        ? "2px solid #F57C00"
                        : undefined,
                  }}
                  onClick={() => handleSelectVisualizationType(type)}
                >
                  <Grid size={{ xs: 12 }}>
                    {isRecommended ? (
                      <Tooltip
                        arrow
                        title={buildRecommendationExplanationTooltip(
                          type,
                          analysis.analyzedData
                        )}
                      >
                        <span>{cardContent}</span>
                      </Tooltip>
                    ) : (
                      <Tooltip
                        arrow
                        title={buildRequirementsTooltip(
                          type,
                          analysis.analyzedData
                        )}
                      >
                        <span>{cardContent}</span>
                      </Tooltip>
                    )}
                  </Grid>
                </Grid>
              );
            })
        )}
      </Grid>

      <Grid container justifyContent="center" spacing={1} sx={{ pt: 2 }}>
        <RecommendIcon color="success" />
        <Typography>
          Recommendation of charts is based on your analyzed data
        </Typography>
      </Grid>
    </Stack>
  );
};

export default TypeSelection;

function buildRecommendationExplanationTooltip(chartType, analyzedData) {
  const requiredTypeCount = {};
  chartType.chartInputs.forEach((input) => {
    if (!input.required) return;
    requiredTypeCount[input.type] = (requiredTypeCount[input.type] || 0) + 1;
  });

  const availableTypeCount = {};
  Object.values(analyzedData).forEach((item) => {
    const type = item.configurationData.type;
    availableTypeCount[type] = (availableTypeCount[type] || 0) + 1;
  });

  const formatTypeName = (type) => {
    if (type === "Text") return "Categorical";
    if (type === "Numeric") return "Numerical";
    return type;
  };

  return (
    <>
      <Typography gutterBottom>
        <b>Why {chartType.name} is recommended?</b>
      </Typography>

      <Typography gutterBottom>
        {chartType.name} requires the following number of data types as inputs:
        <br />
        {Object.entries(requiredTypeCount).map(([type, count]) => (
          <div key={`req-${type}`}>
            ⦁ {count} {formatTypeName(type)} {count > 1 ? "columns" : "column"}
          </div>
        ))}
      </Typography>

      <Typography gutterBottom>
        Your analyzed data has the following number of data types:
        <br />
        {Object.entries(requiredTypeCount).map(([type]) => {
          const count = availableTypeCount[type] || 0;
          const matchingColumns = Object.values(analyzedData)
            .filter((item) => item.configurationData.type === type)
            .map((item) => item.configurationData.title);
          return (
            <div key={`avail-${type}`}>
              ⦁ {count} {formatTypeName(type)}{" "}
              {matchingColumns.length > 0 && (
                <b>({matchingColumns.join(", ")})</b>
              )}
            </div>
          );
        })}
      </Typography>
      <Typography>
        This fulfils the minimum requirement of the chart inputs.
      </Typography>
    </>
  );
}

function buildRequirementsTooltip(chartType, analyzedData) {
  const requiredTypeCount = {};
  for (const input of chartType.chartInputs) {
    if (!input.required) continue;
    requiredTypeCount[input.type] = (requiredTypeCount[input.type] || 0) + 1;
  }

  const availableTypeCount = {};
  for (const key in analyzedData) {
    const type = analyzedData[key].configurationData.type;
    availableTypeCount[type] = (availableTypeCount[type] || 0) + 1;
  }

  const formatTypeName = (type) => {
    if (type === "Text") return "Categorical";
    if (type === "Numeric") return "Numerical";
    return type;
  };

  return (
    <>
      <Typography gutterBottom>
        <b>Why {chartType.name} is not recommended?</b>
      </Typography>
      <Typography gutterBottom>
        {chartType.name} requires the following number of data types as inputs:
        <br />
        {Object.entries(requiredTypeCount).map(([type, count]) => (
          <Typography key={type}>
            ⦁ {count} {formatTypeName(type)} {count > 1 ? "columns" : "column"}
          </Typography>
        ))}
      </Typography>

      <Typography gutterBottom sx={{ mt: 1 }}>
        However, your analyzed data contains:
        <br />
        {Object.entries(requiredTypeCount).map(([type]) => (
          <Typography key={type}>
            ⦁ {availableTypeCount[type] || 0} {formatTypeName(type)} column(s)
          </Typography>
        ))}
      </Typography>
      <Typography>
        This does <b>not</b> fulfil the minimum requirement of the chart inputs.
      </Typography>
    </>
  );
}
