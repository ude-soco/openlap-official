import React, { useContext, useEffect } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Grid,
  Grow,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DataTypes, visualizations } from "../../../utils/data/config.js";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import VisualizationDescription from "./visualization-description.jsx";
import { Recommend } from "@mui/icons-material";

const VisualizationFilter = () => {
  const { dataset, visRef, setVisRef } = useContext(ISCContext);
  const [state, setState] = React.useState({
    openFilters: false,
    visualizationList: [],
    recommendation: false,
    showDescription: false,
  });

  const handleSelectVisualization = (chart) => {
    // TODO: Recheck this
    localStorage.removeItem("categories");
    localStorage.removeItem("series");
    if (visRef.chart.type !== chart.type) {
      setVisRef((prevState) => ({
        ...prevState,
        chart: chart,
      }));
    } else {
      setVisRef((prevState) => ({
        ...prevState,
        chart: {
          type: "",
        },
      }));
    }
  };

  useEffect(() => {
    if (visRef.filter.type === "") {
      setState((prevState) => ({
        ...prevState,
        visualizationList: visualizations,
      }));
    } else {
      let tempVisualizationList = [];
      visualizations.forEach((visualization) => {
        if (visualization.filters.includes(visRef.filter.type)) {
          tempVisualizationList.push(visualization);
        }
      });
      setState((prevState) => ({
        ...prevState,
        visualizationList: tempVisualizationList,
      }));
    }
  }, [visRef.filter.type]);

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      recommendation: checkRecommendation(prevState.visualizationList),
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

  const handleToggleShowDescription = () => {
    setState((prevState) => ({
      ...prevState,
      showDescription: !prevState.showDescription,
    }));
  };

  return (
    <>
      <Accordion variant="outlined" defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <b>Available charts</b>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Grid container spacing={2} justifyContent="center">
                {visRef.filter.type && (
                  <Grid item xs={12}>
                    <Typography align="center" variant="body2">
                      Chart(s) recommended based on chart type:{" "}
                      <b>{visRef.filter.type}</b>
                    </Typography>
                  </Grid>
                )}

                {state.visualizationList
                  .sort((a, b) => a.type.localeCompare(b.type))
                  .map((visualization, index) => {
                    if (visualization.enable) {
                      return (
                        <Grid
                          key={index}
                          item
                          xs={6}
                          sm={4}
                          md={2}
                          sx={{ cursor: "pointer" }}
                          onClick={() =>
                            handleSelectVisualization(visualization)
                          }
                        >
                          <Grid container spacing={2}>
                            <Grid item xs>
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
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
                                    <Paper
                                      variant="outlined"
                                      sx={{
                                        pb: 1,
                                        pt: 2,
                                        "&:hover": {
                                          boxShadow: 5,
                                        },
                                        border:
                                          visRef.chart.type ===
                                          visualization.type
                                            ? "2px solid #F57C00"
                                            : "",
                                      }}
                                    >
                                      <Grid
                                        container
                                        direction="column"
                                        alignItems="center"
                                      >
                                        <Grid item>
                                          <Box
                                            component="img"
                                            src={visualization.image}
                                            height="48px"
                                          />
                                        </Grid>
                                        <Grid item xs={12}>
                                          <Grid container alignItems="center">
                                            {checkVisualizationRecommendation(
                                              visualization,
                                              columnTypes
                                            ) && (
                                              <Grid item>
                                                <Recommend color="success" />
                                              </Grid>
                                            )}
                                            <Grid item xs>
                                              <Typography
                                                variant="body2"
                                                gutterBottom
                                              >
                                                {visualization.type}
                                              </Typography>
                                            </Grid>
                                          </Grid>
                                        </Grid>
                                      </Grid>
                                    </Paper>
                                  </Tooltip>
                                </Grid>
                              </Grid>
                            </Grid>
                          </Grid>
                        </Grid>
                      );
                    }
                  })}
                {state.recommendation && (
                  <Grid item xs={12}>
                    <Grid
                      container
                      spacing={1}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Grid item>
                        <Recommend color="success" />
                      </Grid>
                      <Grid item>
                        <Typography gutterBottom variant="body2">
                          Recommendations are based on your dataset
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
            <Grid item xs={12}>
              {/* // TODO: Complete the show and hide description button for the Visualization module */}
              {Boolean(visRef.chart.type) && (
                <>
                  {!state.showDescription && (
                    <Grid container justifyContent="flex-end">
                      <Button
                        variant="contained"
                        onClick={handleToggleShowDescription}
                      >
                        Show description
                      </Button>
                    </Grid>
                  )}
                  <Grow
                    in={state.showDescription}
                    timeout={{ enter: 500, exit: 0 }}
                    unmountOnExit
                  >
                    <div>
                      <Grid item xs={12}>
                        <Divider />
                      </Grid>
                      <Grid item xs={12}>
                        <VisualizationDescription
                          toggleDescription={handleToggleShowDescription}
                        />
                      </Grid>
                    </div>
                  </Grow>
                </>
              )}
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export default VisualizationFilter;
