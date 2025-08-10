import { useContext, useEffect, useRef, useState } from "react";
import {
  Breadcrumbs,
  Button,
  Chip,
  Divider,
  IconButton,
  Link,
  Paper,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import {
  requestIndicatorCode,
  requestIndicatorFullDetail,
} from "../utils/indicator-dashboard-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { handleDisplayType } from "../utils/utils.js";
import { CustomThemeContext } from "../../../../setup/theme-manager/theme-context-manager.jsx";
import { useSnackbar } from "notistack";
import { LoadingButton } from "@mui/lab";

import ChartPreview from "../../indicator-editor/components/chart-preview.jsx";

const IndicatorPreview = () => {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const params = useParams();
  const [state, setState] = useState({
    loading: false,
    showDetails: true,
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
    setState((p) => ({ ...p, loading: true }));
    loadIndicatorDetail(api, params.id).then((indicatorData) => {
      setState((p) => ({
        ...p,
        ...indicatorData,
        loading: false,
      }));
    });
  }, []);

  const handleEditIndicator = () => {
    console.log("Edit");
  };

  const toggleDetails = () => {
    setState((p) => ({ ...p, showDetails: !p.showDetails }));
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
          Indicator Dashboard
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
              <Skeleton height={900} animation="wave" />
            ) : (
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
                            title={<Typography>Hide details</Typography>}
                          >
                            <IconButton color="primary" onClick={toggleDetails}>
                              {state.showDetails ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip
                            arrow
                            title={<Typography>Edit indicator</Typography>}
                          >
                            <IconButton
                              color="primary"
                              onClick={handleEditIndicator}
                            >
                              <EditIcon />
                            </IconButton>
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
                            <IconButton
                              color="error"
                              // onClick={handleToggleDelete}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                          {/* <DeleteDialog
                            open={state.openDeleteDialog}
                            toggleOpen={handleToggleDelete}
                            message={
                              <Typography>
                                This will delete the indicator permanently from
                                your dashboard.
                              </Typography>
                            }
                            handleDelete={handleDeleteIndicator}
                          /> */}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Divider />
                  </Grid>
                  {state.showDetails && (
                    <>
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
                    </>
                  )}
                  <Grid size={{ xs: 12 }}>
                    <Grid container justifyContent="center">
                      <ChartPreview previewData={state.previewData} />
                    </Grid>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default IndicatorPreview;
