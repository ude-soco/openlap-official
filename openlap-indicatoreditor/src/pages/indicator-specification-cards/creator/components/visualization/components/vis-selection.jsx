import React from "react";
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

const VisSelection = ({
  dataset,
  visRef,
  setVisRef,
  preview,
  customize,
  handleToggleCustomizePanel,
}) => {
  switch (visRef.chart.type) {
    case VisualizationTypes.bar:
      return (
        <BarChart
          dataset={dataset}
          visRef={visRef}
          setVisRef={setVisRef}
          preview={preview}
          customize={customize}
          handleToggleCustomizePanel={handleToggleCustomizePanel}
        />
      );
    case VisualizationTypes.line:
      return (
        <GroupedBarChart
          dataset={dataset}
          visRef={visRef}
          setVisRef={setVisRef}
          preview={preview}
          customize={customize}
          setCustomize={handleToggleCustomizePanel}
        />
      );
    case VisualizationTypes.pie:
      return (
        <PieChart
          dataset={dataset}
          visRef={visRef}
          setVisRef={setVisRef}
          preview={preview}
          customize={customize}
          setCustomize={handleToggleCustomizePanel}
        />
      );
    case VisualizationTypes.polar:
      return (
        <PieChart
          dataset={dataset}
          visRef={visRef}
          setVisRef={setVisRef}
          preview={preview}
          customize={customize}
          setCustomize={handleToggleCustomizePanel}
        />
      );
    case VisualizationTypes.radar:
      return (
        <RadarChart
          dataset={dataset}
          visRef={visRef}
          setVisRef={setVisRef}
          preview={preview}
          customize={customize}
          setCustomize={handleToggleCustomizePanel}
        />
      );
    case VisualizationTypes.scatter:
      return (
        <ScatterPlotChart
          dataset={dataset}
          visRef={visRef}
          setVisRef={setVisRef}
          preview={preview}
          customize={customize}
          setCustomize={handleToggleCustomizePanel}
        />
      );
    case VisualizationTypes.stackedBar:
      return (
        <StackedBarChart
          dataset={dataset}
          visRef={visRef}
          setVisRef={setVisRef}
          preview={preview}
          customize={customize}
          setCustomize={handleToggleCustomizePanel}
        />
      );
    case VisualizationTypes.dot:
      return (
        <DotChart
          dataset={dataset}
          visRef={visRef}
          setVisRef={setVisRef}
          preview={preview}
          customize={customize}
          handleToggleCustomizePanel={handleToggleCustomizePanel}
        />
      );
    case VisualizationTypes.groupedBar:
      return (
        <GroupedBarChart
          dataset={dataset}
          visRef={visRef}
          setVisRef={setVisRef}
          preview={preview}
          customize={customize}
          setCustomize={handleToggleCustomizePanel}
        />
      );
    case VisualizationTypes.treemap:
      return (
        <TreeMap
          dataset={dataset}
          visRef={visRef}
          setVisRef={setVisRef}
          preview={preview}
          customize={customize}
          setCustomize={handleToggleCustomizePanel}
        />
      );
    default:
      return <Typography>Visualization not available.</Typography>;
  }
};

export default VisSelection;
