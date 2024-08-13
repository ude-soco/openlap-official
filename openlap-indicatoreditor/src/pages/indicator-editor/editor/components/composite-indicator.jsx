import React from 'react';
import {Divider, Grid, Typography} from "@mui/material";


const CompositeIndicator = () => {
  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Composite Indicator Editor</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider/>
        </Grid>
        <Grid item xs={12}>
          <Typography>Design</Typography>
        </Grid>
      </Grid>
    </>
  );
}

export default CompositeIndicator;