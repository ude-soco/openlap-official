import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { requestDeleteISC, requestISCDetails } from "../utils/dashboard-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  Backdrop,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { Link as RouterLink } from "react-router-dom";
import PreviewChart from "./preview-chart.jsx";
import DeleteDialog from "../../../../common/components/delete-dialog/delete-dialog.jsx";
import { useSnackbar } from "notistack";
import DataTable from "../../creator/components/dataset/components/data-table.jsx";

// Same en-GB date language as My ISCs so metadata reads identically everywhere.
const formatDate = (time) =>
  time
    ? new Date(time).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const toSentenceCase = (str) =>
  !str ? "" : str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// Lifecycle classification — mirrors My ISCs (a preview of a saved ISC reads as
// "Saved"; the same rules keep drafts labelled consistently if ever previewed).
const lifecycleOf = ({ status, sourceId }) => {
  const s = status || "SAVED";
  if (s === "DRAFT" && sourceId)
    return { label: "Editing draft", color: "warning" };
  if (s === "DRAFT") return { label: "Draft", color: "info" };
  return { label: "Saved", color: "success" };
};

// ---- Small presentational helpers (visual language mirrored from the
// Finalize review's summary cards; kept local so this read-only page stays
// self-contained and does not touch the creator). ----

const SectionPaper = ({ label, children, sx }) => (
  <Paper
    variant="outlined"
    component="section"
    aria-label={label}
    sx={(t) => ({
      p: { xs: 2, sm: 2.5 },
      borderRadius: `${t.custom.radii.card}px`,
      ...sx,
    })}
  >
    {children}
  </Paper>
);
SectionPaper.propTypes = {
  label: PropTypes.string,
  children: PropTypes.node,
  sx: PropTypes.object,
};

const SectionHeading = ({ children }) => (
  <Typography variant="subtitle1" component="h2" fontWeight={600}>
    {children}
  </Typography>
);
SectionHeading.propTypes = { children: PropTypes.node };

const GroupHeading = ({ children }) => (
  <Typography variant="overline" color="text.secondary" component="h3">
    {children}
  </Typography>
);
GroupHeading.propTypes = { children: PropTypes.node };

const Field = ({ label, value, clamp }) => (
  <Stack gap={0.25}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={
        clamp
          ? {
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              overflowWrap: "anywhere",
            }
          : { overflowWrap: "anywhere" }
      }
    >
      {value || "—"}
    </Typography>
  </Stack>
);
Field.propTypes = {
  label: PropTypes.node,
  value: PropTypes.node,
  clamp: PropTypes.bool,
};

const IscPreview = () => {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const params = useParams();
  const [requirements, setRequirements] = useState({});
  const [dataset, setDataset] = useState({});
  const [visRef, setVisRef] = useState({});
  const [state, setState] = useState({
    createdBy: "",
    createdOn: "",
    updatedOn: "",
    status: "",
    sourceId: "",
    loading: false,
    isLoading: { status: false },
    loadingEditIndicator: false,
    openDeleteDialog: false,
    dataRequiredByUser: [],
  });
  // Hero overflow menu (Delete today; Duplicate/Export/Version history later).
  const [menuAnchor, setMenuAnchor] = useState(null);

  useEffect(() => {
    loadingISCPreviewDetails(params.id);
    // Fetch once on mount for the routed id; loader identity is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadingISCPreviewDetails = async (id) => {
    setState((p) => ({ ...p, loading: true }));
    try {
      const details = await requestISCDetails(api, id);
      const parsedVisRef = JSON.parse(details.visRef);
      const parsedDataset = JSON.parse(details.dataset);
      setRequirements(JSON.parse(details.requirements));
      setDataset(parsedDataset);
      setVisRef(parsedVisRef);
      setState((p) => ({
        ...p,
        createdBy: details.createdBy,
        createdOn: details.createdOn,
        updatedOn: details.updatedOn || "",
        status: details.status || "",
        sourceId: details.sourceId || "",
        dataRequiredByUser: handleDataRequiredByUser(
          parsedVisRef,
          parsedDataset
        ),
      }));
    } catch {
      enqueueSnackbar("Could not load this indicator. Please try again.", {
        variant: "error",
      });
    } finally {
      setState((p) => ({ ...p, loading: false }));
    }
  };

  // Route-authoritative (Phase 3): the /isc/:id/edit route owns the
  // create-or-get-edit-draft bootstrap.
  const handleEditIndicator = () => navigate(`/isc/${params.id}/edit`);

  const handleToggleDelete = () => {
    setState((p) => ({ ...p, openDeleteDialog: !p.openDeleteDialog }));
  };

  const handleDeleteIndicator = async () => {
    setState((p) => ({ ...p, isLoading: { ...p.isLoading, status: true } }));
    try {
      await requestDeleteISC(api, params.id);
      enqueueSnackbar("Indicator deleted successfully", { variant: "success" });
      handleToggleDelete();
      navigate("/isc");
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Could not delete this indicator. Please try again.", {
        variant: "error",
      });
    } finally {
      setState((p) => ({ ...p, isLoading: { ...p.isLoading, status: false } }));
    }
  };

  // * Helper function to find the actual data used to create the indicator
  function handleDataRequiredByUser(visRef, dataset) {
    try {
      const selectedKeys = Object.keys(visRef.data.axisOptions).filter((key) =>
        key.includes("selected")
      );
      const selectedValues = selectedKeys.map(
        (key) => visRef.data.axisOptions[key]
      );
      return dataset.columns
        .filter((item) => selectedValues.includes(item.field))
        .map((item) => item.headerName);
    } catch {
      return [];
    }
  }

  // ---- Derived, presentation-only values ----
  const indicatorName = toSentenceCase(requirements.indicatorName);
  const life = lifecycleOf(state);
  const vizType = visRef.chart?.type || "";
  const rowCount = dataset.rows?.length ?? 0;
  const colCount = dataset.columns?.length ?? 0;
  const hasDataset = colCount > 0;
  const hasVisualization = Object.values(visRef).length > 0 && visRef.chart;
  const datasetLabel = `${rowCount} row${rowCount === 1 ? "" : "s"} × ${colCount} column${
    colCount === 1 ? "" : "s"
  }`;

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
            to="/isc"
          >
            My ISCs
          </Link>
          <Typography sx={{ color: "text.primary" }}>
            {indicatorName || "Preview ISC"}
          </Typography>
        </Breadcrumbs>
        <Divider />

        <Container maxWidth="lg" disableGutters>
          {state.loading ? (
            <Stack gap={2}>
              <Skeleton variant="rounded" height={140} />
              <Skeleton variant="rounded" height={220} />
              <Skeleton variant="rounded" height={320} />
            </Stack>
          ) : (
            <Stack gap={{ xs: 2, sm: 3 }}>
              {state.isLoading.status && <LinearProgress />}

              {/* 1. Hero — identity, metadata, primary action + overflow */}
              <SectionPaper label="ISC overview">
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  gap={2}
                  alignItems={{ xs: "flex-start", sm: "flex-start" }}
                  justifyContent="space-between"
                >
                  <Stack gap={1.25} sx={{ minWidth: 0 }}>
                    <Typography
                      variant="h5"
                      component="h1"
                      fontWeight={700}
                      sx={{ overflowWrap: "anywhere" }}
                    >
                      {indicatorName || "Untitled indicator"}
                    </Typography>
                    {/* Metadata chips — same visual language as My ISCs */}
                    <Stack
                      direction="row"
                      gap={1}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Chip
                        size="small"
                        color={life.color}
                        variant="outlined"
                        label={life.label}
                      />
                      {vizType && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<InsightsOutlinedIcon />}
                          label={vizType}
                        />
                      )}
                      {hasDataset && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<TableChartOutlinedIcon />}
                          label={`${rowCount}×${colCount} Dataset`}
                        />
                      )}
                      {state.createdOn && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<ScheduleRoundedIcon />}
                          label={`Created ${formatDate(state.createdOn)}`}
                        />
                      )}
                      {state.updatedOn && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<ScheduleRoundedIcon />}
                          label={`Updated ${formatDate(state.updatedOn)}`}
                        />
                      )}
                    </Stack>
                  </Stack>

                  <Stack
                    direction="row"
                    gap={1}
                    alignItems="center"
                    sx={{ flexShrink: 0 }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={handleEditIndicator}
                      disabled={state.isLoading.status}
                    >
                      Edit
                    </Button>
                    <Tooltip arrow title="More actions">
                      <span>
                        <IconButton
                          aria-label="More actions"
                          aria-haspopup="true"
                          aria-expanded={Boolean(menuAnchor)}
                          onClick={(e) => setMenuAnchor(e.currentTarget)}
                          disabled={state.isLoading.status}
                        >
                          <MoreVertRoundedIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Menu
                      anchorEl={menuAnchor}
                      open={Boolean(menuAnchor)}
                      onClose={() => setMenuAnchor(null)}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      transformOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                      {/* Future actions (Duplicate, Export, Version history)
                          will be added here as additional MenuItems. */}
                      <MenuItem
                        onClick={() => {
                          setMenuAnchor(null);
                          handleToggleDelete();
                        }}
                        sx={{ color: "error.main" }}
                      >
                        <ListItemIcon>
                          <DeleteIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText>Delete</ListItemText>
                      </MenuItem>
                    </Menu>
                  </Stack>
                </Stack>
              </SectionPaper>

              {/* 2. Overview — two cards that mirror the Finalize summary */}
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <SectionPaper
                    label="ISC overview"
                    sx={{ height: "100%" }}
                  >
                    <Stack gap={1.5}>
                      <GroupHeading>ISC overview</GroupHeading>
                      <Field
                        label="Indicator name"
                        value={requirements.indicatorName}
                      />
                      {requirements.goalType?.category && (
                        <Field
                          label="Goal type"
                          value={requirements.goalType.category}
                        />
                      )}
                      <Field label="Goal" value={requirements.goal} clamp />
                      <Field
                        label="Question"
                        value={requirements.question}
                        clamp
                      />
                      {state.dataRequiredByUser.length > 0 && (
                        <Stack gap={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            Data used
                          </Typography>
                          <Stack direction="row" gap={1} flexWrap="wrap">
                            {state.dataRequiredByUser.map((data, index) => (
                              <Chip
                                key={index}
                                size="small"
                                variant="outlined"
                                label={data}
                              />
                            ))}
                          </Stack>
                        </Stack>
                      )}
                    </Stack>
                  </SectionPaper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <SectionPaper label="ISC setup" sx={{ height: "100%" }}>
                    <Stack gap={1.5}>
                      <GroupHeading>ISC setup</GroupHeading>
                      <Field
                        label="Starting point"
                        value={requirements.selectedPath}
                      />
                      <Field
                        label="Visualization"
                        value={vizType || "Not selected"}
                      />
                      <Field label="Dataset" value={datasetLabel} />
                      <Field
                        label="Created"
                        value={formatDate(state.createdOn)}
                      />
                      <Field
                        label="Updated"
                        value={
                          state.updatedOn
                            ? formatDate(state.updatedOn)
                            : "Not updated yet"
                        }
                      />
                    </Stack>
                  </SectionPaper>
                </Grid>
              </Grid>

              {/* 3. Dataset — the canonical data view (unchanged DataGrid) */}
              {hasDataset && (
                <SectionPaper label="Dataset">
                  <Stack gap={2}>
                    <Stack
                      direction="row"
                      gap={1.5}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <SectionHeading>Dataset</SectionHeading>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${rowCount} row${rowCount === 1 ? "" : "s"}`}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${colCount} column${colCount === 1 ? "" : "s"}`}
                      />
                    </Stack>
                    <DataTable rows={dataset.rows} columns={dataset.columns} />
                  </Stack>
                </SectionPaper>
              )}

              {/* 4. Visualization — the primary focus: a large, clean chart
                  preview. The toolbar row is reserved for future actions
                  (Fullscreen, Export image, Download PNG). */}
              {hasVisualization && (
                <SectionPaper label="Visualization">
                  <Stack gap={2}>
                    <Stack
                      direction="row"
                      gap={1.5}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <SectionHeading>Visualization</SectionHeading>
                      {vizType && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<InsightsOutlinedIcon />}
                          label={vizType}
                        />
                      )}
                    </Stack>

                    <Box sx={{ minHeight: { xs: 360, sm: 520 } }}>
                      <PreviewChart visRef={visRef} />
                    </Box>
                  </Stack>
                </SectionPaper>
              )}

              <DeleteDialog
                open={state.openDeleteDialog}
                toggleOpen={handleToggleDelete}
                message={
                  <Typography>
                    This will delete the indicator permanently from your
                    dashboard.
                  </Typography>
                }
                handleDelete={handleDeleteIndicator}
              />
            </Stack>
          )}
        </Container>
      </Stack>
      <Backdrop
        sx={(theme) => ({ color: "#fff", zIndex: theme.zIndex.drawer + 1 })}
        open={state.loadingEditIndicator}
      >
        <Grid container direction="column" alignItems="center" spacing={2}>
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>Loading Indicator</Typography>
        </Grid>
      </Backdrop>
    </>
  );
};

export default IscPreview;
