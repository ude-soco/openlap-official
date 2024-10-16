import React, { useState } from "react";
import { Button, Divider, Grid, Paper, Typography } from "@mui/material";
import MyIscTable from "./components/my-isc-table.jsx";
import { Delete } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";

const IscDashboard = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [indicatorInProgress, setIndicatorInProgress] = useState(() => {
    const savedState = sessionStorage.getItem("session_isc");
    return !!savedState;
  });

  const handleClearSession = () => {
    setIndicatorInProgress((prevState) => !prevState);
    sessionStorage.removeItem("session_isc");
  };

  const handleContinueEditing = () => {
    navigate("/isc/creator");
    enqueueSnackbar("Indicator progress restored", {
      variant: "info",
      autoHideDuration: 2000,
    });
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>ISC Dashboard</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>

        <Grid item xs={12}>
          <MyIscTable />
        </Grid>

        {indicatorInProgress && (
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
                      <Button
                        variant="contained"
                        onClick={handleContinueEditing}
                      >
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
        )}
      </Grid>
    </>
  );
};

export default IscDashboard;
