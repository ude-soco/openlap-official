import {
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { requestIndicatorFullDetail } from "./utils/indicator-dashboard";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { handleDisplayType } from "./utils/utils";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager.jsx";

const IndicatorPreview = () => {
  const { darkMode } = useContext(CustomThemeContext);
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const params = useParams();
  const [state, setState] = useState({
    loading: false,
    id: "",
    name: "",
    type: "",
    createdBy: "",
    createdOn: "",
    visualizationLibrary: "",
    visualizationType: "",
    visualizationParams: {},
    visualizationMapping: {
      mapping: [],
    },
    analyticsTechnique: "",
    analyticsTechniqueMapping: {
      mapping: [],
    },
    analyticsTechniqueParams: [],
    statementResponse: {
      platforms: [],
      activityTypes: [],
      actionOnActivities: [],
      activities: [],
      durationFrom: "",
      durationUntil: "",
    },
    indicatorCode: {
      displayCode: "",
      scriptData: [],
    },
  });

  useEffect(() => {
    const loadIndicatorDetail = async (api, indicatorId) => {
      setState((prevState) => ({
        ...prevState,
        loading: true,
      }));
      try {
        const indicatorDetail = await requestIndicatorFullDetail(
          api,
          indicatorId,
        );
        setState((prevState) => ({
          ...prevState,
          ...indicatorDetail,
          loading: false,
        }));
      } catch (error) {
        console.log("Error requesting my indicators");
      }
    };

    loadIndicatorDetail(api, params.id);
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.innerHTML = state.indicatorCode.scriptData;
    document.getElementById("root").appendChild(script);
    return () => {
      document.getElementById("root").removeChild(script);
    };
  }, [state.indicatorCode.scriptData]);

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Grid container alignItems="center">
          <Grid item>
            <IconButton size="small" onClick={handleGoBack}>
              <ArrowBack />
            </IconButton>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography>Back</Typography>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Divider />
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={5}>
            <Grid container spacing={1}>
              {state.loading ? (
                <Skeleton variant="rounded" height={500} />
              ) : (
                <>
                  <Grid item xs={12}>
                    <Grid
                      container
                      component={Paper}
                      variant="outlined"
                      justifyContent="center"
                      sx={{ backgroundColor: "white", p: 2, borderRadius: 2 }}
                    >
                      <Grid item>{state.indicatorCode.displayCode}</Grid>
                    </Grid>
                  </Grid>
                  {darkMode && (
                    <Grid item xs>
                      <Typography
                        variant="caption"
                        color="inherit"
                        sx={{ fontStyle: "italic" }}
                      >
                        Note: If you are unable to view the label, switch to
                        light mode
                      </Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Grid>
          <Grid item xs={12} lg={7}>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>
                  {state.loading ? <Skeleton /> : `${state.name}`}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                {state.loading ? (
                  <Skeleton />
                ) : (
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Typography>Indicator type:</Typography>
                    </Grid>
                    <Grid item>
                      <Chip label={handleDisplayType(state.type)} />
                    </Grid>
                  </Grid>
                )}
              </Grid>
              <Grid item xs={12}>
                {state.loading ? (
                  <Skeleton />
                ) : (
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Typography>Created by:</Typography>
                    </Grid>
                    <Grid item>
                      <Chip label={state.createdBy} />
                    </Grid>
                  </Grid>
                )}
              </Grid>
              <Grid item xs={12}>
                {state.loading ? (
                  <Skeleton />
                ) : (
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Typography>Created on:</Typography>
                    </Grid>
                    <Grid item>
                      <Chip label={state.createdOn} />
                    </Grid>
                  </Grid>
                )}
              </Grid>
              <Grid item xs={12}>
                {state.loading ? (
                  <Skeleton />
                ) : (
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Typography>Analysis:</Typography>
                    </Grid>
                    <Grid item>
                      <Chip label={state.analyticsTechnique} />
                    </Grid>
                  </Grid>
                )}
              </Grid>
              <Grid item xs={12}>
                {state.loading ? (
                  <Skeleton />
                ) : (
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Typography>Visualization:</Typography>
                    </Grid>
                    <Grid item>
                      <Chip label={state.visualizationType} />
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default IndicatorPreview;
