import React from "react";
import Grid from "@mui/material/Grid2";
import Legends from "./components/legends.jsx";
import Title from "./components/title.jsx";
import Labels from "./components/labels.jsx";
import Axis from "./components/axis.jsx";

const ElementsTab = ({ state, setState }) => {
  return (
    <>
      <Grid container spacing={2}>
        <Legends state={state} setState={setState} />
        <Axis state={state} setState={setState} />
        <Title state={state} setState={setState} />
        <Labels state={state} setState={setState} />
      </Grid>
    </>
  );
};

export default ElementsTab;
