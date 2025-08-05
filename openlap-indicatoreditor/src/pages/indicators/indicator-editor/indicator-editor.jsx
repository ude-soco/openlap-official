import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid2";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Breadcrumbs, Divider, Link, Paper, Typography } from "@mui/material";
import { indicatorData } from "./utils/indicator-data";

const SESSION = "session_indicator";

const IndicatorEditor = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({
    route: "",
    indicatorInProgress: () => {
      let savedState = sessionStorage.getItem(SESSION);
      return !!savedState;
    },
  });

  useEffect(() => {
    const savedState = sessionStorage.getItem(SESSION);
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
      setState((p) => ({
        ...p,
        route: route,
      }));
    }
  }, []);

  const handleClearSession = () => {
    setState((p) => ({ ...p, indicatorInProgress: !p.indicatorInProgress }));
    sessionStorage.removeItem(SESSION);
  };

  const handleCreateIndicator = (link) => {
    navigate(link);
    handleClearSession();
  };

  return (
    <>
      <Grid container spacing={2}>
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
            Indicator Dashboard
          </Link>
          <Typography sx={{ color: "text.primary" }}>
            Create an Indicator
          </Typography>
        </Breadcrumbs>

        <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
          <Divider />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Grid container spacing={2}>
            <Typography gutterBottom>Choose a type of indicator</Typography>
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={2}>
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
                      <Typography variant="h6">
                        {indicatorType.name}
                      </Typography>
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
        </Grid>
      </Grid>
    </>
  );
};

export default IndicatorEditor;
