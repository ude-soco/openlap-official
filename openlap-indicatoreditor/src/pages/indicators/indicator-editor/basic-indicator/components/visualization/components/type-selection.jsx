import { useContext, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import InfoIcon from "@mui/icons-material/Info";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RecommendIcon from "@mui/icons-material/Recommend";
import { BasicContext } from "../../../basic-indicator";
import { visualizationImages } from "../utils/visualization-data";

const TypeSelection = () => {
  const { analysis, visualization, setVisualization } =
    useContext(BasicContext);
  const [state, setState] = useState({ showTypeSelection: false });

  const handleSelectVisualizationType = async (typeSelected) => {
    setVisualization((p) => ({
      ...p,
      selectedType: typeSelected,
      inputs: [...typeSelected.chartInputs],
      params: { height: 500, width: 500 },
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

  return (
    <>
      <Accordion
        defaultExpanded
        elevation={0}
        variant="outlined"
        onChange={(event, expanded) => handleShowSelected(expanded)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Grid container alignItems="center">
            <Typography>
              Available <b>Charts</b>
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
            {state.showTypeSelection ? (
              visualization.selectedType.name.length ? (
                <Chip label={visualization.selectedType.name} />
              ) : undefined
            ) : undefined}
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} justifyContent="center">
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
                    size={{ xs: 6, sm: 4, lg: 3, xl: 2 }}
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
                        <Typography align="center">{type.name}</Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                ))
            )}
          </Grid>

          <Grid container justifyContent="center" spacing={1} sx={{ pt: 2 }}>
            <RecommendIcon color="success" />
            <Typography>
              Recommendation of charts are based on your analyzed data
            </Typography>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export default TypeSelection;
