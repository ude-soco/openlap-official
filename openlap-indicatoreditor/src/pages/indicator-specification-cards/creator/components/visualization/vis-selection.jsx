import React, { useContext } from "react";
import { ISCContext } from "../../indicator-specification-card.jsx";
import { VisualizationTypes } from "../../utils/data/config.js";
import BarChart from "../finalize/components/bar-chart.jsx";
import { Typography } from "@mui/material";
import PieChart from "../finalize/components/pie-chart.jsx";
import ScatterPlotChart from "../finalize/components/scatter-plot-chart.jsx";
import StackedBarChart from "../finalize/components/stacked-bar-chart.jsx";

const VisSelection = () => {
  const { visRef } = useContext(ISCContext);

  switch (visRef.chart.type) {
    case VisualizationTypes.bar:
      return <BarChart />;
    case VisualizationTypes.line:
      return <BarChart />;
    case VisualizationTypes.pie:
      return <PieChart />;
    case VisualizationTypes.polar:
      return <PieChart />;
    case VisualizationTypes.scatter:
      return <ScatterPlotChart />;
    case VisualizationTypes.stackedBar:
      return <StackedBarChart />;
    default:
      return <Typography>Visualization not found</Typography>;
  }
};

export default VisSelection;
