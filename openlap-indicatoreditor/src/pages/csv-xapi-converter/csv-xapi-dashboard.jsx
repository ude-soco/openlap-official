import React from "react";
import { Divider, Grid, Typography } from "@mui/material";

const CsvXapiDashboard = () => {
  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>CSV xAPI Dashboard</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
      </Grid>
    </>
  );
};

export default CsvXapiDashboard;
