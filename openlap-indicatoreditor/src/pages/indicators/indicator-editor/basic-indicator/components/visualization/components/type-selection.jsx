import { useContext, useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Grid,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RecommendRoundedIcon from "@mui/icons-material/RecommendRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { BasicContext } from "../../../basic-indicator";
import { visualizationImages } from "../utils/visualization-data";
import SectionCard from "../../../../../../../common/components/section-card/section-card";
import { defaultParams } from "../utils/visualization-data";

const TypeSelection = () => {
  const { analysis, visualization, setVisualization } =
    useContext(BasicContext);
  // Single popover shared across cards: which chart's "why" explanation is open.
  const [info, setInfo] = useState({ anchorEl: null, type: null });

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

  const handleOpenInfo = (event, type) => {
    event.stopPropagation();
    setInfo({ anchorEl: event.currentTarget, type });
  };

  const handleCloseInfo = () => setInfo({ anchorEl: null, type: null });

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

  return (
    <SectionCard
      title="Chart"
      helper="Charts marked “Recommended” match the data types from your analysis."
    >
      <Grid container spacing={2}>
        {visualization.typeList.flatMap((type, index) =>
          Object.entries(visualizationImages)
            .filter(([name]) => type.imageCode === name)
            .map(([name, svg]) => {
              const isRecommended = isChartRecommended(
                type.chartInputs,
                analysis.analyzedData
              );
              const selected = visualization.selectedType.id === type.id;

              return (
                <Grid
                  key={`${type.imageCode}-${name}-${index}`}
                  size={{ xs: 6, sm: 4, md: 3, lg: 2 }}
                  sx={{ display: "flex" }}
                >
                  <Card
                    variant="outlined"
                    sx={(theme) => ({
                      width: "100%",
                      position: "relative",
                      borderRadius: `${theme.custom.radii.card}px`,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? "primary.main" : undefined,
                      backgroundColor: selected
                        ? alpha(theme.palette.primary.main, 0.06)
                        : undefined,
                      transition: `border-color ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}`,
                    })}
                  >
                    <CardActionArea
                      onClick={() => handleSelectVisualizationType(type)}
                      aria-label={`Select ${type.name} chart${
                        isRecommended ? " (recommended)" : ""
                      }`}
                      aria-pressed={selected}
                      sx={{ p: 2, height: "100%" }}
                    >
                      {selected && (
                        <CheckCircleRoundedIcon
                          color="primary"
                          sx={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            fontSize: 20,
                            bgcolor: "background.paper",
                            borderRadius: "50%",
                          }}
                        />
                      )}
                      <Stack
                        gap={1}
                        alignItems="center"
                        justifyContent="center"
                        sx={{ height: "100%" }}
                      >
                        {isRecommended && (
                          <Chip
                            size="small"
                            color="success"
                            variant="outlined"
                            icon={<RecommendRoundedIcon />}
                            label="Recommended"
                          />
                        )}
                        <Box
                          aria-hidden
                          dangerouslySetInnerHTML={{ __html: svg }}
                        />
                        <Typography variant="body2" align="center">
                          {type.name}
                        </Typography>
                      </Stack>
                    </CardActionArea>
                    <Tooltip arrow title="Why this recommendation?">
                      <IconButton
                        size="small"
                        onClick={(event) => handleOpenInfo(event, type)}
                        aria-label={`Why ${type.name} is${
                          isRecommended ? "" : " not"
                        } recommended`}
                        sx={{ position: "absolute", bottom: 4, right: 4 }}
                      >
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Card>
                </Grid>
              );
            })
        )}
      </Grid>

      <Stack
        direction="row"
        gap={1}
        alignItems="center"
        sx={{ pt: 1, color: "text.secondary" }}
      >
        <RecommendRoundedIcon color="success" fontSize="small" />
        <Typography variant="body2">
          Recommendations are based on your analysed data.
        </Typography>
      </Stack>

      <Popover
        open={Boolean(info.anchorEl)}
        anchorEl={info.anchorEl}
        onClose={handleCloseInfo}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Box sx={{ p: 2, maxWidth: 360 }}>
          {info.type &&
            (isChartRecommended(info.type.chartInputs, analysis.analyzedData)
              ? buildRecommendationExplanationTooltip(
                  info.type,
                  analysis.analyzedData
                )
              : buildRequirementsTooltip(info.type, analysis.analyzedData))}
        </Box>
      </Popover>
    </SectionCard>
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

      <Typography gutterBottom component="div">
        {chartType.name} requires the following number of data types as inputs:
        <br />
        {Object.entries(requiredTypeCount).map(([type, count]) => (
          <div key={`req-${type}`}>
            ⦁ {count} {formatTypeName(type)} {count > 1 ? "columns" : "column"}
          </div>
        ))}
      </Typography>

      <Typography gutterBottom component="div">
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
      <Typography gutterBottom component="div">
        {chartType.name} requires the following number of data types as inputs:
        <br />
        {Object.entries(requiredTypeCount).map(([type, count]) => (
          <Typography key={type}>
            ⦁ {count} {formatTypeName(type)} {count > 1 ? "columns" : "column"}
          </Typography>
        ))}
      </Typography>

      <Typography gutterBottom component="div" sx={{ mt: 1 }}>
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
