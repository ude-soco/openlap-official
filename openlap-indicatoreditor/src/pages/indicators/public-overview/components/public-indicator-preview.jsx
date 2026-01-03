import { useEffect, useState } from "react";
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
  Button,
} from "@mui/material";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import CodeIcon from "@mui/icons-material/Code";
import LoginIcon from "@mui/icons-material/Login";
import ChartPreview from "../../../indicators/indicator-editor/components/chart-preview.jsx";
import { useSnackbar } from "notistack";
import {
  fetchPublicIndicatorDetail,
  fetchPublicIndicatorCode,
} from "../utils/public-indicators-api.js";

const PublicIndicatorPreview = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
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
    isLoading: {
      status: false,
    },
  });

  const loadIndicatorDetail = async () => {
    setState((p) => ({ ...p, loading: true }));
    try {
      const indicatorData = await fetchPublicIndicatorDetail(params.id);
      setState((p) => ({ ...p, ...indicatorData, loading: false }));
    } catch (error) {
      console.error("Error loading indicator details", error);
      enqueueSnackbar("Failed to load indicator details", { variant: "error" });
      setState((p) => ({ ...p, loading: false }));
    }
  };

  useEffect(() => {
    loadIndicatorDetail();
  }, []);

  const handleCopyEmbedCode = async () => {
    setState((p) => ({
      ...p,
      isLoading: { ...p.isLoading, status: true },
    }));
    try {
      const response = await fetchPublicIndicatorCode(params.id);
      await navigator.clipboard.writeText(response.data);
      enqueueSnackbar(response.message || "Code copied to clipboard!", { variant: "success" });
      setState((p) => ({
        ...p,
        isLoading: { ...p.isLoading, status: false },
      }));
    } catch (error) {
      setState((p) => ({
        ...p,
        isLoading: { ...p.isLoading, status: false },
      }));
      console.error("Error copying indicator code", error);
      enqueueSnackbar("Failed to copy indicator code", { variant: "error" });
    }
  };

  // Helper functions
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

  function handleDisplayType(type) {
    switch (type) {
      case "BASIC":
        return "Basic";
      case "COMPOSITE":
        return "Composite";
      case "MULTI_LEVEL":
        return "Multi Level";
      default:
        return type;
    }
  }

  return (
    <Grid container spacing={2} sx={{ p: 3 }}>
      <Breadcrumbs>
        <Link component={RouterLink} underline="hover" color="inherit" to="/">
          Home
        </Link>
        <Link
          component={RouterLink}
          underline="hover"
          color="inherit"
          to="/indicators/overview"
        >
          Public Indicators
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

                            <Divider
                              orientation="vertical"
                              flexItem
                              sx={{ mx: 1 }}
                            />

                            <Tooltip
                              arrow
                              title={<Typography>Login to edit or create your own</Typography>}
                            >
                              <span>
                                <IconButton
                                  color="primary"
                                  onClick={() => navigate("/login")}
                                >
                                  <LoginIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
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

export default PublicIndicatorPreview;
