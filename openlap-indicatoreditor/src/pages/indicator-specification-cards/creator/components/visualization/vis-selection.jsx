import React, { useContext } from "react";
import { ISCContext } from "../../indicator-specification-card.jsx";
import { VisualizationTypes } from "../../utils/data/config.js";
import BarChart from "../finalize/components/bar-chart.jsx";
import { Typography } from "@mui/material";

const VisSelection = () => {
  const { visRef } = useContext(ISCContext);

  switch (visRef.chart.type) {
    case VisualizationTypes.bar:
      return <BarChart />;
    case VisualizationTypes.line:
      return <BarChart />;
    default:
      return <Typography>Visualization not found</Typography>;
  }
};

export default VisSelection;
