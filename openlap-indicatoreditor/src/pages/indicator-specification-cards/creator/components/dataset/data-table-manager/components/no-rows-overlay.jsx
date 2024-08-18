import React from "react";
import { Grid, Typography } from "@mui/material";

const NoRowsOverlay = () => {
  return (
    <>
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        sx={{ height: "100%" }}
      >
        <Grid item>
          <Typography align="center">No data available.</Typography>
          <Typography align="center">
            <b>Create a new column</b> to add data to the table
          </Typography>
        </Grid>
      </Grid>
    </>
  );
};

export default NoRowsOverlay;
