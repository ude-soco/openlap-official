import { useContext, useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Breadcrumbs,
  Button,
  Divider,
  Link,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import MyIndicatorsTable from "./components/my-indicators-table.jsx";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";

const IndicatorEditorDashboard = () => {
  const { SESSION_INDICATOR } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState({ indicatorInProgress: false });

  useEffect(() => {
    let savedState = sessionStorage.getItem(SESSION_INDICATOR);
    setState((p) => ({ ...p, indicatorInProgress: Boolean(savedState) }));
  }, []);

  const handleContinueEditing = () => {
    if (state.indicatorInProgress) {
      let route;
      switch (
        JSON.parse(sessionStorage.getItem(SESSION_INDICATOR)).indicator.type
      ) {
        case "BASIC":
          navigate("/indicator/editor/basic");
          break;
        case "COMPOSITE":
          navigate("/indicator/editor/composite");
          break;
        case "MULTI_LEVEL":
          navigate("/indicator/editor/multi-level-analysis");
          break;
        default:
          route = "Unknown";
      }
    }
    enqueueSnackbar("Indicator progress restored", {
      variant: "info",
      autoHideDuration: 2000,
    });
  };

  const handleClearSession = () => {
    setState((p) => ({ ...p, indicatorInProgress: !p.indicatorInProgress }));
    sessionStorage.removeItem(SESSION_INDICATOR);
  };

  const handleCreateNew = () => {
    handleClearSession();
    navigate("/indicator/editor");
  };

  return (
    <>
      <Grid container spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography sx={{ color: "text.primary" }}>
            Indicator Dashboard
          </Typography>
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
          <MyIndicatorsTable />
        </Grid>
      </Grid>
    </>
  );
};

export default IndicatorEditorDashboard;
