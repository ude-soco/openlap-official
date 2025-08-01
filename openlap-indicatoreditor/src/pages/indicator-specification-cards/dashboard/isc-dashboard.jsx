import { useState } from "react";
import {
  Alert,
  AlertTitle,
  Breadcrumbs,
  Button,
  Divider,
  Link,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Grid from "@mui/material/Grid2";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import MyIscTable from "./components/my-isc-table.jsx";

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

  const handleCreateNew = () => {
    handleClearSession();
    navigate("/isc/creator");
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

        <Grid size={12}>
          <Button
          size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
          >
            Create new
          </Button>
        </Grid>
        {indicatorInProgress && (
          <Grid size={{ xs: 12 }}>
            <Alert
              severity="info"
              action={
                <Grid container spacing={1}>
                  <Button variant="outlined" onClick={handleClearSession}>
                    Discard
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleContinueEditing}
                  >
                    Continue
                  </Button>
                </Grid>
              }
            >
              <AlertTitle>
                You have an indicator in progress! Would you like to continue?
              </AlertTitle>
            </Alert>
          </Grid>
        )}
        <Grid size={{ xs: 12 }}>
          <MyIscTable />
        </Grid>
      </Grid>
    </>
  );
};

export default IscDashboard;
