import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Divider,
  Grid,
  Link,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestIndicatorFullDetail } from "../../dashboard/utils/indicator-dashboard-api.js";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChartPreview from "../../indicator-editor/components/chart-preview.jsx";

const IndicatorPoolPreview = () => {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const [state, setState] = useState({
    indicator: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const loadIndicatorDetails = async () => {
      setState((p) => ({ ...p, loading: true, error: null }));
      try {
        const indicatorData = await requestIndicatorFullDetail(api, id);// Fetch full details of the indicator using its ID
        
        setState((p) => ({
          ...p,
          indicator: indicatorData,
          loading: false,
        }));
      } catch (error) {
        console.error("Error loading indicator details", error);
        setState((p) => ({
          ...p,
          loading: false,
          error: "Failed to load indicator details",
        }));
      }
    };

    if (id) {
      loadIndicatorDetails();
    }
  }, [id, api]);

  const handleDisplayType = (type) => {
    switch (type) {
      case "BASIC":
        return <Chip label="Basic" variant="outlined" color="success" />;
      case "COMPOSITE":
        return <Chip label="Composite" variant="outlined" color="info" />;
      case "MULTI_LEVEL":
        return <Chip label="Multi Level" variant="outlined" color="warning" />;
      default:
        return <Chip label={type} variant="outlined" color="default" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (state.loading) {// Loading state=true displays a message while the indicator details are being fetched
    return (
      <Box sx={{ width: "100%" }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: "center" }}>
          Loading indicator...
        </Typography>
      </Box>
    );
  }

  if (state.error || !state.indicator) {// Error state displays an error message if fetching fails and displays a back button to return to the indicator pool
    return (
      <Stack spacing={2}>
        <Typography color="error">{state.error || "Indicator not found"}</Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/indicator/pool")}
        >
          Back to Indicator Pool
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Breadcrumbs>
        <Link component={RouterLink} underline="hover" color="inherit" to="/">
          Home
        </Link>
        <Link
          component={RouterLink}
          underline="hover"
          color="inherit"
          to="/indicator/pool"
        >
          Indicator Pool
        </Link>
        <Typography>{state.indicator.indicatorName}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/indicator/pool")}
          variant="outlined"
        >
          Back
        </Button>
      </Box>

      <Divider />

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h4" component="h1">
            {state.indicator.indicatorName}
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {handleDisplayType(state.indicator.type)}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Created By:</strong> {state.indicator.createdBy}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Created On:</strong>{" "}
                {formatDate(state.indicator.createdOn)}
              </Typography>
            </Grid>
            {state.indicator.analyticsMethod && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Analytics Method:</strong>{" "}
                  {state.indicator.analyticsMethod}
                </Typography>
              </Grid>
            )}
            {state.indicator.library && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Visualization Library:</strong>{" "}
                  {state.indicator.library}
                </Typography>
              </Grid>
            )}
            {state.indicator.chart && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Chart Type:</strong> {state.indicator.chart}
                </Typography>
              </Grid>
            )}
          </Grid>

          <Divider />

          <Typography variant="h6">Visualization Preview</Typography>

          {state.indicator.previewData && state.indicator.previewData.displayCode ? ( // If preview data && display code is available  -> render the indicator using ChartPreview component
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                minHeight: 400,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChartPreview previewData={state.indicator.previewData} />
            </Box>
          ) : (
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: 2,
                minHeight: 400,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              //In case no preview data is available -> display a message to the user 
            > 
              <Typography color="text.secondary">
                No visualization preview available
              </Typography>
            </Box>
          )} 
        </Stack>
      </Paper>
    </Stack>
  );
};

export default IndicatorPoolPreview;
