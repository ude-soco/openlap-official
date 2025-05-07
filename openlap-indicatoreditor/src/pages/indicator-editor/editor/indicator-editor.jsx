import { Button, Divider, Grid, Paper, Typography } from "@mui/material";
import { Delete } from "@mui/icons-material";
import React, { useEffect, useState } from "react";
import CreateIndicator from "./create-indicator.jsx";
import { useNavigate } from "react-router-dom";

const IndicatorEditor = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({
    route: "",
  });
  useEffect(() => {
    const savedState = sessionStorage.getItem("session");
    if (savedState) {
      let route;
      switch (JSON.parse(savedState).indicator.type) {
        case "BASIC":
          route = "/indicator/editor/basic";
          break;
        case "COMPOSITE":
          route = "/indicator/editor/composite";
          break;
        case "MULTI_LEVEL":
          route = "/indicator/editor/multi-level-analysis";
          break;
        default:
          route = "Unknown";
      }
      setState((prevState) => ({
        ...prevState,
        route: route,
      }));
    }
  }, []);

  const handleContinueDraft = () => {
    navigate(state.route);
  };

  const handleClearSession = () => {
    sessionStorage.removeItem("session");
    sessionStorage.removeItem("dataset");
    sessionStorage.removeItem("filters");
    sessionStorage.removeItem("analysis");
    sessionStorage.removeItem("visualization");
    setState((prevState) => ({
      ...prevState,
      route: "",
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Indicator Editor</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
        <Grid item xs={12}>
          <CreateIndicator handleClearSession={handleClearSession} />
        </Grid>
        {/* {state.route && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }} variant="outlined">
              <Grid
                container
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid item>
                  <Typography>
                    You have an indicator in progress. Would you like to
                    continue?
                  </Typography>
                </Grid>
                <Grid item>
                  <Grid container spacing={2}>
                    <Grid item>
                      <Button variant="contained" onClick={handleContinueDraft}>
                        Continue
                      </Button>
                    </Grid>
                    <Grid item>
                      <Button
                        color="error"
                        onClick={handleClearSession}
                        startIcon={<Delete />}
                      >
                        Discard
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )} */}
      </Grid>
    </>
  );
};

export default IndicatorEditor;
