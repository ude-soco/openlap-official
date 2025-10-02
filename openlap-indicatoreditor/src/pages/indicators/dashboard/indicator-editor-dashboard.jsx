import { useContext, useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Breadcrumbs,
  Button,
  Divider,
  Link,
  Grid,
  Typography,
} from "@mui/material";
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
    const indicatorDraft = JSON.parse(
      sessionStorage.getItem(SESSION_INDICATOR)
    );
    const { type: indicatorType, id: indicatorExist } =
      indicatorDraft.indicator;

    const baseRoutes = {
      BASIC: "/indicator/editor/basic",
      COMPOSITE: "/indicator/editor/composite",
      MULTI_LEVEL: "/indicator/editor/multi-level-analysis",
    };

    const baseRoute = baseRoutes[indicatorType];

    const route = indicatorExist
      ? `${baseRoute}/edit/${indicatorExist}`
      : baseRoute;

    navigate(route);

    enqueueSnackbar("Indicator data restored", {
      variant: "info",
      autoHideDuration: 2000,
    });
  };

  const handleClearSession = () => {
    setState((p) => ({ ...p, indicatorInProgress: !p.indicatorInProgress }));
    sessionStorage.removeItem(SESSION_INDICATOR);
  };

  return (
    <>
      <Grid container spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography sx={{ color: "text.primary" }}>
            My Indicators
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
