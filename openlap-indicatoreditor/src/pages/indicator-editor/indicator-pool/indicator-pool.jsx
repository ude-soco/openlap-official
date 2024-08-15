import { Divider, Grid, Typography } from "@mui/material";
import React from "react";

const IndicatorPool = () => {
  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Indicator Pool</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
      </Grid>
    </>
  );
};
export default IndicatorPool;
