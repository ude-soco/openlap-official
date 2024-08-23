import React from "react";
import { Divider, Grid, Typography } from "@mui/material";
import MyIndicatorsTable from "./components/my-indicators-table.jsx";

const IndicatorEditorDashboard = () => {
  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Indicator Dashboard</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>

        <Grid item xs={12}>
          <MyIndicatorsTable />
        </Grid>
      </Grid>
    </>
  );
};

export default IndicatorEditorDashboard;
