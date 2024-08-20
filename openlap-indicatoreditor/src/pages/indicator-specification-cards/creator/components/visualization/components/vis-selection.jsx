import React, { useContext } from "react";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { VisualizationTypes } from "../../../utils/data/config.js";
import BarChart from "../../finalize/components/bar-chart.jsx";
import { Typography } from "@mui/material";
import PieChart from "../../finalize/components/pie-chart.jsx";
import ScatterPlotChart from "../../finalize/components/scatter-plot-chart.jsx";
import StackedBarChart from "../../finalize/components/stacked-bar-chart.jsx";
import DotChart from "../../finalize/components/dot-chart.jsx";
import GroupedBarChart from "../../finalize/components/grouped-bar-chart.jsx";
import RadarChart from "../../finalize/components/radar-chart.jsx";
import TreeMap from "../../finalize/components/treemap.jsx";

const VisSelection = () => {
  const { visRef } = useContext(ISCContext);

  switch (visRef.chart.type) {
    case VisualizationTypes.bar:
      return <BarChart />;
    case VisualizationTypes.line:
      return <GroupedBarChart />;
    case VisualizationTypes.pie:
      return <PieChart />;
    case VisualizationTypes.polar:
      return <PieChart />;
    case VisualizationTypes.radar:
      return <RadarChart />;
    case VisualizationTypes.scatter:
      return <ScatterPlotChart />;
    case VisualizationTypes.stackedBar:
      return <StackedBarChart />;
    case VisualizationTypes.dot:
      return <DotChart />;
    case VisualizationTypes.groupedBar:
      return <GroupedBarChart />;
    case VisualizationTypes.treemap:
      return <TreeMap />;
    default:
      return <Typography>Visualization not available.</Typography>;
  }
};

export default VisSelection;
