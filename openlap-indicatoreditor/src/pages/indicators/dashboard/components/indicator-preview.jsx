import {
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import { ArrowBack, Edit } from "@mui/icons-material";
import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  requestIndicatorCode,
  requestIndicatorFullDetail,
} from "../utils/indicator-dashboard-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { handleDisplayType } from "../utils/utils.js";
import { CustomThemeContext } from "../../../../setup/theme-manager/theme-context-manager.jsx";
import { useSnackbar } from "notistack";
import { LoadingButton } from "@mui/lab";

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
    copyCode: {
      loading: false,
      code: "",
    },
  });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const loadIndicatorDetail = async (api, indicatorId) => {
      try {
        return await requestIndicatorFullDetail(api, indicatorId);
      } catch (error) {
        console.log("Error requesting my indicators");
      }
    };
    setState((prevState) => ({
      ...prevState,
      loading: true,
    }));
    loadIndicatorDetail(api, params.id).then((response) => {
      setState((prevState) => ({
        ...prevState,
        ...response,
        loading: false,
      }));
    });
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

  const handleCopyCode = () => {
    setState((prevState) => ({
      ...prevState,
      copyCode: {
        ...prevState.copyCode,
        loading: true,
      },
    }));
    const loadIndicatorCode = async (api, indicatorId) => {
      try {
        return await requestIndicatorCode(api, indicatorId);
      } catch (error) {
        setState((prevState) => ({
          ...prevState,
          copyCode: {
            ...prevState.copyCode,
            loading: false,
          },
        }));
        enqueueSnackbar(error.response.data.message, { variant: "error" });
        console.error("Error requesting my indicators");
      }
    };

    loadIndicatorCode(api, state.id).then((response) => {
      console.log("response", response);
      navigator.clipboard.writeText(response.data).then(() =>
        setState(() => ({
          ...state,
          copyCode: {
            ...state.copyCode,
            loading: false,
            code: response.data,
          },
        }))
      );
      enqueueSnackbar(response.message, { variant: "success" });
    });
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
          <Grid item>
            <Typography>Back</Typography>
          </Grid>
          <Grid item xs>
            <Typography align="center">Indicator</Typography>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Divider />
      </Grid>
      <Grid item xs={12} sx={{ mt: 2 }}>
        <Grid container justifyContent="center" spacing={2}>
          {state.loading && (
            <Grid item xs={12} lg={7}>
              <Skeleton variant="rounded" height={850} />
            </Grid>
          )}
          {!state.loading && (
            <>
              <Grid item xs={12} lg={7}>
                <Grid container justifyContent="flex-end" spacing={1}>
                  <Grid item>
                    <LoadingButton
                      loading={state.copyCode.loading}
                      // loadingPosition="start"
                      variant="contained"
                      color="primary"
                      onClick={handleCopyCode}
                    >
                      Copy Code
                    </LoadingButton>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} lg={7}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="h5" gutterBottom>
                            {state.name}
                          </Typography>
                          <Grid container spacing={1} alignItems="center">
                            <Grid item>
                              <Chip label={handleDisplayType(state.type)} />
                            </Grid>
                            <Grid item>
                              <Typography variant="body2">
                                Created on: {state.createdOn.split("T")[0]}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid item xs={12}>
                          <Divider />
                        </Grid>

                        {state.type === "BASIC" && (
                          <>
                            {Object.values(state.statementResponse.platforms)
                              .length > 0 && (
                              <Grid item xs={12} md={6}>
                                <Typography variant="overline">
                                  Platform
                                </Typography>
                                <Grid container spacing={1}>
                                  {state.statementResponse.platforms.map(
                                    (platform, index) => (
                                      <Grid item key={index}>
                                        <Chip label={platform} />
                                      </Grid>
                                    )
                                  )}
                                </Grid>
                              </Grid>
                            )}
                            {Object.values(
                              state.statementResponse.activityTypes
                            ).length > 0 && (
                              <Grid item xs={12} md={6}>
                                <Typography variant="overline">
                                  Activity types
                                </Typography>
                                <Grid container spacing={1}>
                                  {state.statementResponse.activityTypes.map(
                                    (activityType, index) => (
                                      <Grid item key={index}>
                                        <Chip label={activityType} />
                                      </Grid>
                                    )
                                  )}
                                </Grid>
                              </Grid>
                            )}

                            {Object.values(
                              state.statementResponse.actionOnActivities
                            ).length > 0 && (
                              <>
                                <Grid item xs={12}>
                                  <Typography variant="overline">
                                    Actions
                                  </Typography>
                                  <Grid container spacing={1}>
                                    {state.statementResponse.actionOnActivities.map(
                                      (action, index) => (
                                        <Grid item key={index}>
                                          <Chip label={action} />
                                        </Grid>
                                      )
                                    )}
                                  </Grid>
                                </Grid>
                              </>
                            )}
                            <Grid item xs={12}>
                              <Divider />
                            </Grid>
                          </>
                        )}

                        {(state.type === "COMPOSITE" ||
                          state.type === "MULTI_LEVEL") && (
                          <>
                            <Grid item xs={12} md={4}>
                              <Typography variant="overline">
                                Platform
                              </Typography>
                              <Grid container spacing={1}>
                                {state.platforms.map((platform, index) => (
                                  <Grid item key={index}>
                                    <Chip label={platform} />
                                  </Grid>
                                ))}
                              </Grid>
                            </Grid>
                            <Grid item xs={12} md={8}>
                              <Typography variant="overline">
                                Basic Indicators used
                              </Typography>
                              <Grid container spacing={1}>
                                {state.indicators.map((indicator, index) => (
                                  <Grid item key={index}>
                                    <Chip label={indicator} />
                                  </Grid>
                                ))}
                              </Grid>
                            </Grid>

                            <Grid item xs={12}>
                              <Divider />
                            </Grid>
                          </>
                        )}

                        {(state.type === "BASIC" ||
                          state.type === "MULTI_LEVEL") && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="overline">Analysis</Typography>
                            <Grid item xs={12}>
                              <Chip label={state.analyticsTechnique} />
                            </Grid>
                          </Grid>
                        )}

                        <Grid item xs={12} md={6}>
                          <Typography variant="overline">Idiom</Typography>
                          <Grid item xs={12}>
                            <Chip label={state.visualizationType} />
                          </Grid>
                        </Grid>

                        <Grid item xs={12}>
                          <Divider />
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid item xs={12}>
                      <Grid container spacing={1}>
                        <Grid item xs={12}>
                          <Grid
                            container
                            justifyContent="center"
                            sx={{
                              backgroundColor: "white",
                              p: 2,
                              borderRadius: 2,
                            }}
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
                              Note: If you are unable to view the label, switch
                              to light mode
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </>
          )}
        </Grid>
      </Grid>
    </Grid>
  );
};

export default IndicatorPreview;
