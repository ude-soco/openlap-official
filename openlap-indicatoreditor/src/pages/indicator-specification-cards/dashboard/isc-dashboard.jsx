import React, { useState } from "react";
import {
  Breadcrumbs,
  Button,
  Divider,
  Link,
  Paper,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Grid from "@mui/material/Grid2";
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
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography sx={{ color: "text.primary" }}>ISC Dashboard</Typography>
        </Breadcrumbs>

        <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
          <Divider />
        </Grid>

        <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
          <MyIscTable />
        </Grid>

        {indicatorInProgress && (
          <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
            <Paper sx={{ p: 3 }} variant="outlined">
              <Grid
                container
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography>
                  You have an indicator in progress. Would you like to continue?
                </Typography>

                <Grid container spacing={2}>
                  <Button variant="contained" onClick={handleContinueEditing}>
                    Continue
                  </Button>

                  <Button
                    color="error"
                    onClick={handleClearSession}
                    startIcon={<Delete />}
                  >
                    Discard
                  </Button>
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
