import {Divider, Grid, Typography,} from "@mui/material";
import React from "react";
import CreateIndicator from "./components/create-indicator.jsx";

const IndicatorEditor = () => {
  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Indicator Editor</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider/>
        </Grid>
        <Grid item xs={12}>
          <CreateIndicator/>
        </Grid>
      </Grid>
    </>
  );
};

export default IndicatorEditor;
