import React, { useContext, useEffect } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Grid,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { visualizations } from "../../../utils/data/config.js";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import VisualizationDescription from "./visualization-description.jsx";

const VisualizationFilter = () => {
  const { visRef, setVisRef } = useContext(ISCContext);
  const [state, setState] = React.useState({
    openFilters: false,
    visualizationList: [],
  });

  const handleSelectVisualization = (chart) => {
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

  return (
    <>
      <Accordion variant="outlined" defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          Available charts
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Grid container spacing={2} justifyContent="center">
                {state.visualizationList.map((visualization) => {
                  if (visualization.enable) {
                    return (
                      <Grid
                        item
                        xs={6}
                        sm={4}
                        md={2}
                        sx={{ cursor: "pointer" }}
                        onClick={() => handleSelectVisualization(visualization)}
                      >
                        <Grid container spacing={2}>
                          <Grid item xs>
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
                                  pb: 2,
                                  pt: 3,
                                  "&:hover": {
                                    boxShadow: 5,
                                  },
                                  border:
                                    visRef.chart.type === visualization.type
                                      ? "2px solid #F57C00"
                                      : "",
                                }}
                              >
                                <Grid
                                  container
                                  direction="column"
                                  alignItems="center"
                                  spacing={2}
                                >
                                  <Grid item>
                                    <Box
                                      component="img"
                                      src={visualization.image}
                                      height="72px"
                                    />
                                  </Grid>
                                  <Grid item>
                                    <Typography align="center">
                                      {visualization.type}
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </Paper>
                            </Tooltip>
                          </Grid>
                        </Grid>
                      </Grid>
                    );
                  }
                })}
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Divider />
            </Grid>

            {visRef.chart.type !== "" && (
              <Grid item xs={12}>
                <VisualizationDescription />
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export default VisualizationFilter;
