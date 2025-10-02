import { useContext, useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Breadcrumbs,
  Grid,
  Button,
  Divider,
  Link,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import MyIscTable from "./components/my-isc-table.jsx";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";

const IscDashboard = () => {
  const { SESSION_ISC } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState({ indicatorInProgress: false });

  useEffect(() => {
    let savedState = sessionStorage.getItem(SESSION_ISC);
    setState((p) => ({ ...p, indicatorInProgress: Boolean(savedState) }));
  }, []);

  const handleClearSession = () => {
    setState((p) => ({ ...p, indicatorInProgress: !p.indicatorInProgress }));
    sessionStorage.removeItem(SESSION_ISC);
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
          <Typography sx={{ color: "text.primary" }}>My ISCs</Typography>
        </Breadcrumbs>

        <Grid size={{ xs: 12 }}>
          <Divider />
        </Grid>

        {state.indicatorInProgress && (
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
