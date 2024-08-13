import React from 'react';
import {useNavigate} from "react-router-dom";
import {Divider, Grid, IconButton, Tooltip, Typography} from "@mui/material";
import {ArrowBack} from "@mui/icons-material";

const MultiLevelAnalysisIndicator = () => {
  const navigate = useNavigate();
  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container alignItems="center">
            <Grid item>
              <Tooltip arrow title={<Typography variant="body2">Back to Indicator Editor</Typography>}>
                <IconButton size="small" onClick={() => navigate("/indicator/editor")}>
                  <ArrowBack/>
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item xs>
              <Typography align="center">Multi-level Analysis Indicator Editor</Typography>
            </Grid>
          </Grid>
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

export default MultiLevelAnalysisIndicator;