import { useContext, useEffect, useState } from "react";
import {
  Breadcrumbs,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Link,
  Grid,
  Paper,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CodeIcon from "@mui/icons-material/Code";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import {
  requestIndicatorCode,
  requestIndicatorDeletion,
  requestIndicatorFullDetail,
} from "../utils/indicator-dashboard-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { handleDisplayType } from "../utils/utils.js";
import { useSnackbar } from "notistack";
import ChartPreview from "../../indicator-editor/components/chart-preview.jsx";
import CustomDialog from "../../../../common/components/custom-dialog/custom-dialog.jsx";

const IndicatorPreview = () => {
  const { api, SESSION_INDICATOR } = useContext(AuthContext);
  const navigate = useNavigate();
  const params = useParams();
  const [state, setState] = useState({
    loading: false,
    indicatorName: "",
    type: "",
    createdOn: "",
    createdBy: "",
    analyticsMethod: "",
    library: "",
    chart: "",
    previewData: {
      displayCode: [],
      scriptData: "",
    },
    configuration: "",
    isLoading: {
      status: false,
    },
    openDeleteDialog: false,
  });
  const { enqueueSnackbar } = useSnackbar();

  const loadIndicatorDetail = async () => {
    setState((p) => ({ ...p, loading: true }));
    try {
      const indicatorData = await requestIndicatorFullDetail(api, params.id);
      setState((p) => ({ ...p, ...indicatorData, loading: false }));
    } catch (error) {
      console.log("Error requesting my indicators");
      setState((p) => ({ ...p, loading: false }));
    }
  };

  useEffect(() => {
    loadIndicatorDetail();
  }, []);

  const handleEditIndicator = () => {
    setState((p) => ({
      ...p,
      isLoading: { ...p.isLoading, status: true },
    }));
    sessionStorage.setItem(SESSION_INDICATOR, state.configuration);
    let route;
    if (state.type) {
      switch (state.type) {
        case "BASIC":
          navigate(`/indicator/editor/basic/edit/${params.id}`);
          break;
        case "COMPOSITE":
          navigate(`/indicator/editor/composite/edit/${params.id}`);
          break;
        case "MULTI_LEVEL":
          navigate(`/indicator/editor/multi-level-analysis/edit/${params.id}`);
          break;
        default:
          route = "Unknown";
      }
    } else {
      setState((p) => ({
        ...p,
        isLoading: { ...p.isLoading, status: false },
      }));
      enqueueSnackbar("Something went wrong. Try again later", {
        variant: "error",
      });
    }
  };

  const handleCopyEmbedCode = async () => {
    setState((p) => ({
      ...p,
      isLoading: { ...p.isLoading, status: true },
    }));
    try {
      const indicatorCode = await requestIndicatorCode(api, params.id);
      await navigator.clipboard.writeText(indicatorCode.data);
      enqueueSnackbar(indicatorCode.message, { variant: "success" });
      setState((p) => ({
        ...p,
        isLoading: { ...p.isLoading, status: false },
      }));
    } catch (error) {
      setState((p) => ({
        ...p,
        isLoading: { ...p.isLoading, status: false },
      }));
      console.error("Error requesting my indicators", error);
    }
  };

  const handleToggleDelete = () => {
    setState((p) => ({ ...p, openDeleteDialog: !p.openDeleteDialog }));
  };

  const handleDeleteIndicator = async () => {
    setState((p) => ({
      ...p,
      isLoading: {
        ...p.isLoading,
        status: true,
      },
    }));
    try {
      await requestIndicatorDeletion(api, params.id);
      enqueueSnackbar("Indicator deleted!", { variant: "success" });
      navigate("/indicator");
    } catch (error) {
      setState((p) => ({
        isLoading: {
          ...p.isLoading,
          status: false,
          type: undefined,
        },
      }));
      enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  // * Helper functions
  function toSentenceCase(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function changeTimeFormat(time) {
    return new Date(time).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
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
          My Indicators
        </Link>
        <Typography sx={{ color: "text.primary" }}>
          Preview Indicator
        </Typography>
      </Breadcrumbs>
      <Grid size={{ xs: 12 }}>
        <Divider />
      </Grid>

      <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
        <Grid container justifyContent="center">
          <Grid size={{ xs: 12, lg: 10, xl: 7 }}>
            {state.loading ? (
              <Skeleton variant="rounded" height={500} />
            ) : (
              <>
                {state.isLoading.status && <LinearProgress />}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Grid container spacing={1}>
                        <Grid size="grow">
                          <Typography variant="h5" gutterBottom>
                            {toSentenceCase(state.indicatorName)}
                          </Typography>
                          <Typography gutterBottom variant="body2">
                            {handleDisplayType(state.type)} ● Created on:{" "}
                            {changeTimeFormat(state.createdOn)} ● Created by:{" "}
                            {state.createdBy}
                          </Typography>
                        </Grid>

                        <Grid size="auto">
                          <Grid container>
                            <Tooltip
                              arrow
                              title={
                                <>
                                  <Typography gutterBottom>
                                    Copy ICC code
                                  </Typography>
                                  <Typography>
                                    What's an ICC code?
                                    <br />
                                    An Interactive Indicator Code (ICC) is an
                                    iFrame code snippet you can embed in any web
                                    application that supports iFrames.
                                    <br />
                                    It lets you display real-time analytics
                                    directly within your website.
                                  </Typography>
                                </>
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={handleCopyEmbedCode}
                                  disabled={state.isLoading.status}
                                >
                                  <CodeIcon />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip
                              arrow
                              title={<Typography>Edit indicator</Typography>}
                            >
                              <span>
                                <IconButton
                                  color="primary"
                                  onClick={handleEditIndicator}
                                  disabled={state.isLoading.status}
                                >
                                  <EditIcon />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Divider
                              orientation="vertical"
                              flexItem
                              sx={{ mx: 1 }}
                            />

                            <Tooltip
                              arrow
                              title={<Typography>Edit indicator</Typography>}
                            >
                              <span>
                                <IconButton
                                  color="error"
                                  disabled={state.isLoading.status}
                                  onClick={handleToggleDelete}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <CustomDialog
                              type="delete"
                              content={`This will delete the indicator permanently from your dashboard.`}
                              open={state.openDeleteDialog}
                              toggleOpen={handleToggleDelete}
                              handler={handleDeleteIndicator}
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Divider />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="overline">
                            Analytics method used
                          </Typography>
                          <Grid size={{ xs: 12 }}>
                            <Chip label={state.analyticsMethod} />
                          </Grid>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="overline">
                            Visualization Library
                          </Typography>
                          <Grid size={{ xs: 12 }}>
                            <Chip label={state.library} />
                          </Grid>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="overline">Chart</Typography>
                          <Grid size={{ xs: 12 }}>
                            <Chip label={state.chart} />
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Divider />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Grid container justifyContent="center">
                        <ChartPreview previewData={state.previewData} />
                      </Grid>
                    </Grid>
                  </Grid>
                </Paper>
              </>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default IndicatorPreview;
