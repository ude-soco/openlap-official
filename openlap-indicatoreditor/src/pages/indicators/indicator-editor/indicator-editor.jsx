import { useContext, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  Breadcrumbs,
  Button,
  Divider,
  Link,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { indicatorData } from "./utils/indicator-data";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";

const IndicatorEditor = () => {
  const { SESSION_INDICATOR } = useContext(AuthContext);
  const navigate = useNavigate();
  const [state, setState] = useState({ indicatorInProgress: false });

  useEffect(() => {
    let savedState = sessionStorage.getItem(SESSION_INDICATOR);
    setState((p) => ({ ...p, indicatorInProgress: Boolean(savedState) }));
  }, []);

  const handleClearSession = () => {
    setState((p) => ({ ...p, indicatorInProgress: !p.indicatorInProgress }));
    sessionStorage.removeItem(SESSION_INDICATOR);
  };

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
  };

  const handleCreateIndicator = (link) => {
    handleClearSession();
    navigate(link);
  };

  return (
    <>
      <Stack gap={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Link
            component={RouterLink}
            underline="hover"
            color="inherit"
            to="/indicator"
          >
            My Indicators
          </Link>
          <Typography sx={{ color: "text.primary" }}>
            Create an Indicator
          </Typography>
        </Breadcrumbs>

        <Divider />

        <Grid container spacing={2}>
          <Typography gutterBottom>Choose a type of indicator</Typography>
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2} justifyContent="center">
              {indicatorData.map((indicatorType, index) => (
                <Grid
                  key={index}
                  component={Paper}
                  size={{ xs: 12, sm: 6, md: 4, xl: 3 }}
                  onClick={() => handleCreateIndicator(indicatorType.link)}
                  sx={{
                    p: 3,
                    "&:hover": { boxShadow: 5 },
                    cursor: "pointer",
                  }}
                >
                  <Grid container spacing={1}>
                    <Paper
                      elevation={0}
                      component="img"
                      src={indicatorType.image}
                      alt={indicatorType.imageCode}
                      loading="lazy"
                      sx={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: "white",
                      }}
                    />
                    <Typography variant="h6">{indicatorType.name}</Typography>
                    <Typography variant="body1">
                      {indicatorType.description}
                    </Typography>
                    {indicatorType.condition && (
                      <Typography variant="body2">
                        <b>Condition:</b> {indicatorType.condition}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
        {state.indicatorInProgress && (
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
        )}
      </Stack>
    </>
  );
};

export default IndicatorEditor;
