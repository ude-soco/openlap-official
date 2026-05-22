import { isValidElement, useEffect, useState } from "react";
import {
  Alert,
  Breadcrumbs,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Link,
  Grid,
  Paper,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
  Button,
} from "@mui/material";
import { useParams, Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import CodeIcon from "@mui/icons-material/Code";
import LoginIcon from "@mui/icons-material/Login";
import EditIcon from "@mui/icons-material/Edit";
import InsightsIcon from "@mui/icons-material/Insights";
import ChartPreview from "../../../indicators/indicator-editor/components/chart-preview.jsx";
import ChartErrorState from "./chart-error-state.jsx";
import { useSnackbar } from "notistack";
import {
  fetchPublicIndicatorDetail,
  fetchPublicIndicatorCode,
  fetchPublicPreviewWithData,
} from "../utils/public-indicators-api.js";
import {
  PENDING_PERSONALIZED_SAVE_KEY,
  createPendingPersonalizedSave,
} from "../../utils/personalized-save";

const PENDING_INDICATOR_NAME_KEY = "pendingIndicatorName";

const PublicIndicatorPreview = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();

  // Extract CourseMapper integration parameters from URL
  const userId = searchParams.get("userId");
  const lrsId = searchParams.get("lrsId");
  const platform = searchParams.get("platform");
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

  const [myDataPreview, setMyDataPreview] = useState({
    loading: false,
    error: null,
    previewData: null,
  });
  const [showMyDataChartError, setShowMyDataChartError] = useState(false);

  const [previewMode, setPreviewMode] = useState("DEFAULT");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveNameDialogOpen, setSaveNameDialogOpen] = useState(false);
  const [pendingIndicatorName, setPendingIndicatorName] = useState("");

  const activeChartData =
    previewMode === "MY_DATA" && myDataPreview.previewData
      ? myDataPreview.previewData
      : state.previewData;

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
  const handlePreviewWithMyData = async () => {
    setShowMyDataChartError(false);
    setMyDataPreview((prev) => ({ ...prev, loading: true, error: null }));

  try {
    const data = await fetchPublicPreviewWithData(
      params.id,
      lrsId,
      userId,
      platform
    );

    const firstEl = data?.displayCode?.[0];
    const hasDisplayCode = Array.isArray(data?.displayCode) && data.displayCode.length > 0;
    const normalizedDisplay = typeof firstEl === "string" ? firstEl.trim() : "";
    const scriptData = typeof data?.scriptData === "string" ? data.scriptData : "";

    // Check A: raw HTML path (iframe or div with content)
    const hasIframeContent = /<iframe\b[\s\S]*?>[\s\S]*?<\/iframe>|<iframe\b/i.test(normalizedDisplay);
    let hasDivWithContent = false;
    const divMatch = normalizedDisplay.match(/<div\b([^>]*)>([\s\S]*?)<\/div>/i);
    if (divMatch) {
      const inner = (divMatch[2] || "").trim();
      const attrs = divMatch[1] || "";
      hasDivWithContent = inner.length > 0 || /id=|class=|data-|style=|role=|aria-/i.test(attrs);
    }
    const checkAHasHtmlContent = hasIframeContent || hasDivWithContent;

    // Check B: script-based chart path
    const checkBHasMeaningfulScript =
      (isValidElement(firstEl) || typeof firstEl === "object" || /<div\b/i.test(normalizedDisplay)) &&
      scriptData.trim().length > 80;

    // No-data signal detection
    const hasLikelyNoChartData =
      /series\s*:\s*\[\s*\]/i.test(scriptData) ||
      /data\s*:\s*\[\s*\]/i.test(scriptData) ||
      /\bno\s*data\b/i.test(scriptData);

    const hasCriticalEmptyValues =
      !hasDisplayCode ||
      ((firstEl == null || normalizedDisplay.length === 0) && scriptData.length === 0);

    const isDataValid =
      !hasCriticalEmptyValues &&
      !hasLikelyNoChartData &&
      (checkAHasHtmlContent || checkBHasMeaningfulScript);

    if (!isDataValid) {
      setMyDataPreview({
        loading: false,
        error: hasLikelyNoChartData
          ? "No chart data was returned for the selected LRS/user context. Please try Edit Indicator to adjust the data source or filters."
          : 'Preview with your data is not available. Please click "Edit Indicator" to manually configure the data source.',
        previewData: null,
      });
      setShowMyDataChartError(true);
      setPreviewMode("DEFAULT");
      return;
    }

    setMyDataPreview({ loading: false, error: null, previewData: data });
    setShowMyDataChartError(false);
    setSaveError(null);
    setPreviewMode("MY_DATA");

  } catch (err) {
    const serverMsg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message;
    const statusCode = err?.response?.status;

    setMyDataPreview({
      loading: false,
      error:
        statusCode === 404
          ? "Preview endpoint not found. Please ensure the backend is running with the latest changes."
          : `Unable to generate preview with your data${serverMsg ? `: ${serverMsg}` : ""}. Please click "Edit Indicator" to manually configure the data source.`,
      previewData: null,
    });
    setShowMyDataChartError(true);
    setPreviewMode("DEFAULT");
  }
  };

  const handleSaveToDashboard = async () => {
    if (!lrsId || !userId) {
      setSaveError("Missing CourseMapper user context. Please reopen this indicator from CourseMapper.");
      return;
    }
    setSaveError(null);
    setPendingIndicatorName(state.indicatorName || "");
    setSaveNameDialogOpen(true);
  };

  const handleConfirmSaveToDashboard = async () => {
    if (!pendingIndicatorName.trim()) return;

    setSaveLoading(true);
    localStorage.setItem(PENDING_INDICATOR_NAME_KEY, pendingIndicatorName.trim());
    sessionStorage.setItem(
      PENDING_PERSONALIZED_SAVE_KEY,
      JSON.stringify(
        createPendingPersonalizedSave({
          indicatorId: params.id,
          indicatorName: pendingIndicatorName.trim(),
          indicatorType: state.type,
          userId,
          lrsId,
          platform,
        })
      )
    );
    sessionStorage.setItem("redirectAfterLogin", "/");
    setSaveNameDialogOpen(false);
    setSaveLoading(false);
    const navigationState = {};
    if (userId) navigationState.userId = userId;
    if (lrsId) navigationState.lrsId = lrsId;
    if (platform) navigationState.platform = platform;

    navigate("/login", {
      state: Object.keys(navigationState).length ? navigationState : undefined,
    });
  };

  const handleBackToDefault = () => {
    setPreviewMode("DEFAULT");
    setSaveError(null);
    setShowMyDataChartError(false);
    setMyDataPreview((prev) => ({ ...prev, error: null }));
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
          to={`/indicators/overview${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
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
                              title={<Typography>Edit this indicator</Typography>}
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    const destination = `/indicator/editor/basic/edit/${params.id}`;
                                    // Store intended destination in sessionStorage
                                    sessionStorage.setItem('redirectAfterLogin', destination);
                                    
                                    // Prepare navigation state with CourseMapper integration data
                                    const navigationState = { 
                                      from: destination,
                                      indicatorId: params.id
                                    };
                                    
                                    // Include userId and lrsId if present (CourseMapper integration)
                                    if (userId) navigationState.userId = userId;
                                    if (lrsId) navigationState.lrsId = lrsId;
                                    if (platform) navigationState.platform = platform;
                                    
                                    navigate(`/login`, { state: navigationState });
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip
                              arrow
                              title={<Typography>Login to create your own</Typography>}
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    // Prepare navigation state with CourseMapper integration data
                                    const navigationState = {};
                                    if (userId) navigationState.userId = userId;
                                    if (lrsId) navigationState.lrsId = lrsId;
                                    if (platform) navigationState.platform = platform;
                                    
                                    navigate("/login", { 
                                      state: Object.keys(navigationState).length > 0 ? navigationState : undefined 
                                    });
                                  }}
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
                    {userId && lrsId && (
                      <>
                        <Grid size={{ xs: 12 }}>
                          {previewMode === "MY_DATA" ? (
                            <Alert
                              severity="info"
                              action={
                                <>
                                  <Button
                                    color="inherit"
                                    size="small"
                                    onClick={handleSaveToDashboard}
                                    disabled={saveLoading || myDataPreview.loading}
                                    sx={{ mr: 1 }}
                                  >
                                    {saveLoading ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    color="inherit"
                                    size="small"
                                    onClick={handleBackToDefault}
                                    disabled={saveLoading}
                                  >
                                    Back
                                  </Button>
                                </>
                              }
                            >
                              Previewing this indicator with your CourseMapper data.
                            </Alert>
                          ) : myDataPreview.error ? (
                            <Alert
                              severity="warning"
                              action={
                                showMyDataChartError ? (
                                  <Button color="inherit" size="small" onClick={handleBackToDefault}>
                                    Back to Default
                                  </Button>
                                ) : null
                              }
                            >
                              {myDataPreview.error}
                            </Alert>
                          ) : (
                            <Grid container spacing={1} alignItems="center">
                              <Grid size="grow">
                                <Typography variant="subtitle2">
                                  CourseMapper Integration
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Preview this indicator using data from your course.
                                </Typography>
                              </Grid>
                              <Grid size="auto">
                                <Button
                                  variant="contained"
                                  startIcon={<InsightsIcon />}
                                  onClick={handlePreviewWithMyData}
                                  disabled={myDataPreview.loading}
                                >
                                  Preview with My Data
                                </Button>
                              </Grid>
                            </Grid>
                          )}
                        </Grid>
                        {myDataPreview.loading && (
                          <Grid size={{ xs: 12 }}>
                            <LinearProgress />
                          </Grid>
                        )}
                        {saveError && (
                          <Grid size={{ xs: 12 }}>
                            <Alert severity="error" onClose={() => setSaveError(null)}>
                              {saveError}
                            </Alert>
                          </Grid>
                        )}
                      </>
                    )}

                    <Grid size={{ xs: 12 }}>
                      <Divider />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Grid container justifyContent="center">
                        {showMyDataChartError ? (
                          <ChartErrorState />
                        ) : (
                          <ChartPreview
                            key={previewMode}
                            previewData={activeChartData}
                          />
                        )}
                      </Grid>
                    </Grid>
                  </Grid>
                </Paper>
              </>
            )}
          </Grid>
        </Grid>
      </Grid>

      <Dialog fullWidth maxWidth="sm" open={saveNameDialogOpen} onClose={() => setSaveNameDialogOpen(false)}>
        <DialogTitle>Provide a name to the indicator</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            You were previewing a public indicator with your data. Provide a name to save it to your dashboard.
          </Typography>
          <TextField
            fullWidth
            label="Indicator name"
            value={pendingIndicatorName}
            onChange={(e) => setPendingIndicatorName(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setSaveNameDialogOpen(false)}
            disabled={saveLoading}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleConfirmSaveToDashboard}
            disabled={pendingIndicatorName.trim().length === 0 || saveLoading}
          >
            {saveLoading ? "Saving..." : "Continue to login"}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default PublicIndicatorPreview;
