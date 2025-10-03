import { useState, useContext, useEffect } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Grow,
  Grid,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VisualizationDescription from "./visualization-description";
import RecommendIcon from "@mui/icons-material/Recommend";
import { DataTypes, visualizations } from "../../../../utils/data/config";
import { ISCContext } from "../../../../indicator-specification-card";

const VisualizationFilter = () => {
  const { dataset, visRef, setVisRef } = useContext(ISCContext);
  const [state, setState] = useState({
    openFilters: false,
    visualizationList: [],
    recommendation: false,
  });
  const [columnError, setColumnError] = useState({
    hasError: false,
    errorMessages: [],
  });

  const handleSelectVisualization = (chart) => {
    // TODO: Recheck this
    localStorage.removeItem("categories");
    localStorage.removeItem("series");
    if (visRef.chart.type !== chart.type) {
      setVisRef((p) => ({ ...p, chart: chart }));
    } else {
      setVisRef((p) => ({ ...p, chart: { type: "" } }));
    }
  };

  useEffect(() => {
    if (!visRef.chart || !visRef.chart.dataTypes || !dataset.columns) return;

    const validTypeValues = new Set(
      Object.values(DataTypes).map((dt) => dt.value)
    );

    const requiredTypes = visRef.chart.dataTypes.reduce((acc, dt) => {
      if (dt.required > 0) acc[dt.type.value] = dt.required;
      return acc;
    }, {});

    const availableTypes = dataset.columns.reduce((acc, col) => {
      const colType = col.dataType.value;
      if (validTypeValues.has(colType)) acc[colType] = (acc[colType] || 0) + 1;
      return acc;
    }, {});

    const messages = [];

    Object.entries(requiredTypes).forEach(([type, requiredCount]) => {
      const availableCount = availableTypes[type] || 0;
      const sufficient = availableCount >= requiredCount;
      if (!sufficient) {
        messages.push(
          `<b>${requiredCount}</b> <b>${type}</b> data column(s) required, but found <b>${availableCount}</b>`
        );
      }
    });

    if (messages.length > 0) {
      setColumnError({ hasError: true, errorMessages: messages });
    } else {
      setColumnError({ hasError: false, errorMessages: [] });
    }
  }, [visRef.chart, dataset.columns]);

  useEffect(() => {
    if (visRef.filter.type === "") {
      setState((p) => ({ ...p, visualizationList: visualizations }));
    } else {
      let tempVisualizationList = [];
      visualizations.forEach((visualization) => {
        if (visualization.filters.includes(visRef.filter.type)) {
          tempVisualizationList.push(visualization);
        }
      });
      setState((p) => ({ ...p, visualizationList: tempVisualizationList }));
    }
  }, [visRef.filter.type]);

  useEffect(() => {
    setState((p) => ({
      ...p,
      recommendation: checkRecommendation(p.visualizationList),
    }));
  }, [dataset.columns]);

  const columnTypes = dataset.columns.map((col) => col.type);

  const checkRecommendation = (visualizations) => {
    for (let viz of visualizations) {
      if (checkVisualizationRecommendation(viz, columnTypes)) {
        return true;
      }
    }
    return false;
  };

  const checkVisualizationRecommendation = (visualization, columnTypes) => {
    // Count the total required columns for each type
    let requiredCategorical = 0;
    let requiredNumerical = 0;
    let requiredCatOrdered = 0;

    visualization.dataTypes.forEach((dataType) => {
      if (dataType.type === DataTypes.categorical) {
        requiredCategorical += dataType.required;
      } else if (dataType.type === DataTypes.numerical) {
        requiredNumerical += dataType.required;
      } else if (dataType.type === DataTypes.catOrdered) {
        requiredCatOrdered += dataType.required;
      }
    });

    // Count the available columns of each type in the dataset
    const availableStrings = columnTypes.filter(
      (type) => type === "string"
    ).length;
    const availableNumbers = columnTypes.filter(
      (type) => type === "number"
    ).length;

    // Check if the dataset meets the visualization requirements
    const hasRequiredStrings =
      availableStrings >= requiredCategorical + requiredCatOrdered;
    const hasRequiredNumbers = availableNumbers >= requiredNumerical;

    return hasRequiredStrings && hasRequiredNumbers;
  };

  return (
    <>
      <Stack gap={2}>
        <Typography>
          <b>Available charts</b>
        </Typography>
        <Stack gap={4}>
          <Stack gap={4} justifyContent="center">
            {visRef.filter.type && (
              <Typography align="center" variant="body2">
                Chart(s) recommended based on chart type:{" "}
                <b>{visRef.filter.type}</b>
              </Typography>
            )}
            <Grid container spacing={2} justifyContent="center">
              {state.visualizationList
                .sort((a, b) => a.type.localeCompare(b.type))
                .map((visualization, index) => {
                  if (visualization.enable) {
                    return (
                      <Grid
                        key={index}
                        component={Paper}
                        variant="outlined"
                        size={{ xs: 6, sm: 3, lg: 2 }}
                        sx={{
                          cursor: "pointer",
                          p: 2,
                          "&:hover": {
                            boxShadow: 5,
                          },
                          border:
                            visRef.chart.type === visualization.type
                              ? "2px solid #F57C00"
                              : "",
                        }}
                        onClick={() => handleSelectVisualization(visualization)}
                      >
                        <Tooltip
                          arrow
                          title={
                            <Typography
                              variant="body2"
                              sx={{ p: 1, whiteSpace: "pre-line" }}
                            >
                              {visualization.description}
                            </Typography>
                          }
                        >
                          <Stack
                            gap={2}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Box sx={{ position: "relative" }}>
                              <Box
                                component="img"
                                src={visualization.image}
                                height="56px"
                              />
                              {checkVisualizationRecommendation(
                                visualization,
                                columnTypes
                              ) && (
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
                              {visualization.type}
                            </Typography>
                          </Stack>
                        </Tooltip>
                      </Grid>
                    );
                  }
                })}
            </Grid>
            {state.recommendation && (
              <Stack
                gap={1}
                direction="row"
                alignItems="center"
                justifyContent="center"
              >
                <RecommendIcon
                  color="success"
                  sx={{ borderRadius: 50, bgcolor: "white" }}
                />
                <Typography variant="body2">
                  Recommendations are based on your dataset
                </Typography>
              </Stack>
            )}
          </Stack>
          <Grow
            in={Boolean(visRef.chart.type)}
            timeout={{ enter: 500, exit: 0 }}
            unmountOnExit
          >
            <Stack gap={4}>
              <Divider />
              <VisualizationDescription columnError={columnError} />
            </Stack>
          </Grow>
        </Stack>
      </Stack>
    </>
  );
};

export default VisualizationFilter;
