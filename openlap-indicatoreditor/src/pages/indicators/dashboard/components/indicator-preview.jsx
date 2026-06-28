import { useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CodeIcon from "@mui/icons-material/Code";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
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
import EmptyState from "../../../../common/components/empty-state/empty-state.jsx";

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

const formatTypeName = (type) => {
  if (type === "Text") return "Categorical";
  if (type === "Numeric") return "Numerical";
  return type;
};

// ---- Local presentational helpers (visual language mirrored from the ISC
// preview/detail page; kept local so this read-only page stays self-contained). ----

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
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const { enqueueSnackbar } = useSnackbar();

  const loadIndicatorDetail = async () => {
    setState((p) => ({ ...p, loading: true }));
    try {
      const indicatorData = await requestIndicatorFullDetail(api, params.id);
      setState((p) => ({ ...p, ...indicatorData, loading: false }));
    } catch (error) {
      console.error("Error requesting indicator detail", error);
      setState((p) => ({ ...p, loading: false }));
    }
  };

  useEffect(() => {
    loadIndicatorDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditIndicator = () => {
    setState((p) => ({
      ...p,
      isLoading: { ...p.isLoading, status: true },
    }));
    sessionStorage.setItem(SESSION_INDICATOR, state.configuration);
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
          break;
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

  // Derived, presentation-only values from the EXISTING response (configuration
  // is part of the indicator detail — parsed defensively, never a backend call).
  const config = useMemo(() => {
    try {
      return state.configuration ? JSON.parse(state.configuration) : {};
    } catch {
      return {};
    }
  }, [state.configuration]);

  const dataSource =
    config?.dataset?.selectedLRSList
      ?.map((lrs) => lrs.lrsTitle)
      .filter(Boolean)
      .join(", ") || "";
  const timeframe = config?.filters?.selectedTime
    ? `${formatDate(config.filters.selectedTime.from)} – ${formatDate(
        config.filters.selectedTime.until
      )}`
    : "";

  const columns = useMemo(() => {
    const analyzedData = config?.analysis?.analyzedData || {};
    return Object.keys(analyzedData)
      .map((key) => ({
        title: analyzedData[key]?.configurationData?.title,
        type: formatTypeName(analyzedData[key]?.configurationData?.type),
        data: analyzedData[key]?.data || [],
      }))
      .filter((col) => col.title);
  }, [config]);

  const colCount = columns.length;
  const rowCount = columns[0]?.data?.length ?? 0;
  const hasDataset = colCount > 0 && rowCount > 0;
  const resultSize = hasDataset
    ? `${rowCount} row${rowCount === 1 ? "" : "s"} × ${colCount} column${
        colCount === 1 ? "" : "s"
      }`
    : "";
  const hasChart = (state.previewData?.displayCode?.length ?? 0) > 0;
  const indicatorName = toSentenceCase(state.indicatorName);

  const displayedRows = [...Array(rowCount).keys()].slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
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
          {indicatorName || "Preview Indicator"}
        </Typography>
      </Breadcrumbs>
      <Divider />

      <Container maxWidth="lg" disableGutters>
        {state.loading ? (
          <Stack gap={2}>
            <Skeleton variant="rounded" height={140} />
            <Skeleton variant="rounded" height={220} />
            <Skeleton variant="rounded" height={420} />
          </Stack>
        ) : (
          <Stack gap={{ xs: 2, sm: 3 }}>
            {state.isLoading.status && <LinearProgress />}

            {/* 1. Header — identity, metadata, primary action + overflow */}
            <SectionPaper label="Indicator overview">
              <Stack
                direction={{ xs: "column", sm: "row" }}
                gap={2}
                alignItems="flex-start"
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
                  <Stack
                    direction="row"
                    gap={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Chip
                      size="small"
                      color="success"
                      variant="outlined"
                      label={handleDisplayType(state.type)}
                    />
                    {state.chart && (
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<InsightsOutlinedIcon />}
                        label={state.chart}
                      />
                    )}
                    {state.library && (
                      <Chip size="small" variant="outlined" label={state.library} />
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
                  <Tooltip
                    arrow
                    title={
                      <>
                        <Typography gutterBottom>Copy embed code (ICC)</Typography>
                        <Typography variant="body2">
                          An Interactive Indicator Code (ICC) is an iframe
                          snippet you can embed in any web app that supports
                          iframes, to show this indicator live.
                        </Typography>
                      </>
                    }
                  >
                    <span>
                      <IconButton
                        color="primary"
                        aria-label="Copy embed code"
                        onClick={handleCopyEmbedCode}
                        disabled={state.isLoading.status}
                      >
                        <CodeIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
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

            {/* 2. Overview + Setup */}
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <SectionPaper label="Indicator overview" sx={{ height: "100%" }}>
                  <Stack gap={1.5}>
                    <GroupHeading>Indicator overview</GroupHeading>
                    <Field label="Indicator name" value={state.indicatorName} />
                    <Field
                      label="Type"
                      value={handleDisplayType(state.type)}
                    />
                    <Field
                      label="Analytics method"
                      value={state.analyticsMethod}
                    />
                    <Field label="Data source" value={dataSource} />
                  </Stack>
                </SectionPaper>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <SectionPaper label="Indicator setup" sx={{ height: "100%" }}>
                  <Stack gap={1.5}>
                    <GroupHeading>Indicator setup</GroupHeading>
                    <Field label="Visualization" value={state.chart} />
                    <Field label="Visualization library" value={state.library} />
                    <Field label="Result size" value={resultSize} />
                    <Field label="Timeframe" value={timeframe} />
                    <Field label="Created" value={formatDate(state.createdOn)} />
                    <Field label="Created by" value={state.createdBy} />
                  </Stack>
                </SectionPaper>
              </Grid>
            </Grid>

            {/* 3. Dataset preview */}
            <SectionPaper label="Dataset">
              <Stack gap={2}>
                <Stack
                  direction="row"
                  gap={1.5}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <SectionHeading>Dataset</SectionHeading>
                  {hasDataset && (
                    <>
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
                    </>
                  )}
                </Stack>
                {hasDataset ? (
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={(t) => ({ borderRadius: `${t.custom.radii.card}px` })}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {columns.map((column, index) => (
                            <TableCell
                              key={index}
                              component="th"
                              scope="col"
                              sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                            >
                              {column.title} ({column.type})
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayedRows.map((rowIndex) => (
                          <TableRow key={rowIndex} hover>
                            {columns.map((column, colIndex) => (
                              <TableCell key={colIndex}>
                                {column.data[rowIndex]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <TablePagination
                      rowsPerPageOptions={[5, 10, 25]}
                      component="div"
                      count={rowCount}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={(e, newPage) => setPage(newPage)}
                      onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                      }}
                    />
                  </TableContainer>
                ) : (
                  <EmptyState
                    icon={SearchOffRoundedIcon}
                    title="No dataset preview available"
                    description="This indicator doesn't have a saved analysed-data sample to display here."
                  />
                )}
              </Stack>
            </SectionPaper>

            {/* 4. Visualization preview */}
            <SectionPaper label="Visualization">
              <Stack gap={2}>
                <Stack
                  direction="row"
                  gap={1.5}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <SectionHeading>Visualization</SectionHeading>
                  {state.chart && (
                    <Chip
                      size="small"
                      variant="outlined"
                      icon={<InsightsOutlinedIcon />}
                      label={state.chart}
                    />
                  )}
                </Stack>
                {hasChart ? (
                  <Box sx={{ minHeight: { xs: 360, sm: 520 } }}>
                    <ChartPreview previewData={state.previewData} responsive />
                  </Box>
                ) : (
                  <EmptyState
                    icon={InsightsOutlinedIcon}
                    title="No chart to preview"
                    description="A preview of this indicator's chart isn't available."
                  />
                )}
              </Stack>
            </SectionPaper>

            <CustomDialog
              type="delete"
              content="This will delete the indicator permanently from your dashboard."
              open={state.openDeleteDialog}
              toggleOpen={handleToggleDelete}
              handler={handleDeleteIndicator}
            />
          </Stack>
        )}
      </Container>
    </Stack>
  );
};

export default IndicatorPreview;
