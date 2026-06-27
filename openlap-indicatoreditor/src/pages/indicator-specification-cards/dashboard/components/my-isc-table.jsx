import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TablePagination,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import PreviewIcon from "@mui/icons-material/Preview";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import {
  requestDeleteISC,
  requestISCDetails,
  requestMyISCs,
} from "../utils/dashboard-api";
import {
  createOrGetEditDraft,
  discardDraft,
} from "../../creator/utils/isc-draft-api.js";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first", sortBy: "createdOn", dir: "desc" },
  { value: "oldest", label: "Oldest first", sortBy: "createdOn", dir: "asc" },
  { value: "nameAsc", label: "Name A–Z", sortBy: "indicatorName", dir: "asc" },
  { value: "nameDesc", label: "Name Z–A", sortBy: "indicatorName", dir: "desc" },
];

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "SAVED", label: "Saved" },
  { value: "DRAFT", label: "Drafts" },
];

const toSentenceCase = (str) =>
  !str ? "" : str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

const formatDate = (time) =>
  time
    ? new Date(time).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

// Lifecycle classification from backend fields.
const lifecycleOf = (item) => {
  const status = item.status || "SAVED";
  if (status === "DRAFT" && (item.draftKind === "EDIT_DRAFT" || item.sourceId)) {
    return { key: "editDraft", label: "Editing draft", color: "warning" };
  }
  if (status === "DRAFT") {
    return { key: "draft", label: "Draft", color: "info" };
  }
  return { key: "saved", label: "Saved", color: "success" };
};

export default function MyIscTable({ onStats }) {
  const { api, SESSION_ISC } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [indicatorList, setIndicatorList] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  // All server-side now: page, size, createdOn/indicatorName sort, status filter,
  // and search (indicatorName regex).
  const [params, setParams] = useState({
    page: 0,
    size: 10,
    sortBy: "createdOn",
    sortDirection: "desc",
    status: "",
    search: "",
  });
  const [sort, setSort] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("list");
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadMyISCList = async (query) => {
    setLoading(true);
    setIndicatorList([]);
    try {
      const response = await requestMyISCs(api, query);
      const content = response.content ?? [];
      setIndicatorList(content);
      setTotalElements(response.totalElements ?? 0);
      const latest = content.reduce((max, i) => {
        const t = i.updatedOn || i.createdOn;
        return !max || new Date(t) > new Date(max) ? t : max;
      }, null);
      onStats?.({ total: response.totalElements ?? 0, latest });
    } catch {
      enqueueSnackbar("Error requesting my indicators", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyISCList(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.page,
    params.size,
    params.sortBy,
    params.sortDirection,
    params.status,
    params.search,
  ]);

  // Debounce the free-text search into the server query.
  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) =>
        p.search === searchTerm ? p : { ...p, search: searchTerm, page: 0 }
      );
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleSortChange = (event) => {
    const value = event.target.value;
    setSort(value);
    const opt = SORT_OPTIONS.find((o) => o.value === value);
    if (opt) {
      setParams((p) => ({
        ...p,
        sortBy: opt.sortBy,
        sortDirection: opt.dir,
        page: 0,
      }));
    }
  };

  const handleFilterChange = (event) =>
    setParams((p) => ({ ...p, status: event.target.value, page: 0 }));

  const handlePageChange = (event, newPage) =>
    setParams((p) => ({ ...p, page: newPage }));

  const handleRowsPerPageChange = (event) =>
    setParams((p) => ({ ...p, size: parseInt(event.target.value, 10), page: 0 }));

  const handlePreview = (id) => navigate(`/isc/${id}`);
  const handlePreviewSource = (sourceId) => navigate(`/isc/${sourceId}`);

  // Parse + stash an ISC's slices into the session, then route into the creator.
  const loadIntoCreator = (parsedData, draftMeta, route) => {
    parsedData.visRef.edit = true;
    sessionStorage.setItem(
      SESSION_ISC,
      JSON.stringify({
        id: null,
        requirements: parsedData.requirements,
        dataset: parsedData.dataset,
        visRef: parsedData.visRef,
        lockedStep: parsedData.lockedStep,
        draftMeta,
      })
    );
    navigate(route);
  };

  const parseDetails = (responseData) => {
    const parsed = JSON.parse(JSON.stringify(responseData));
    parsed.requirements = JSON.parse(parsed.requirements);
    parsed.dataset = JSON.parse(parsed.dataset);
    parsed.visRef = JSON.parse(parsed.visRef);
    parsed.lockedStep = JSON.parse(parsed.lockedStep);
    return parsed;
  };

  // Continue an existing backend draft (new or edit) by its own draft id.
  const handleContinueDraft = async (item) => {
    setBusyId(item.id);
    try {
      const parsed = parseDetails(await requestISCDetails(api, item.id));
      const isEdit = item.draftKind === "EDIT_DRAFT" || Boolean(item.sourceId);
      loadIntoCreator(
        parsed,
        {
          mode: isEdit ? "EDIT_DRAFT" : "NEW_DRAFT",
          draftId: item.id,
          sourceId: item.sourceId || null,
          status: "DRAFT",
          lastAutosavedAt: null,
          autosaveError: null,
        },
        isEdit ? `/isc/creator/edit/${item.sourceId}` : "/isc/creator"
      );
    } catch (error) {
      console.error("Could not open draft", error);
      enqueueSnackbar("Could not open this draft", { variant: "error" });
      setBusyId(null);
    }
  };

  // Edit a SAVED ISC → create/find its edit draft (Phase 1 behavior).
  const handleEditIndicator = async (id) => {
    setBusyId(id);
    try {
      let draftId = null;
      try {
        const editDraft = await createOrGetEditDraft(api, id);
        draftId = editDraft.id;
      } catch (draftError) {
        console.warn("Edit-draft endpoint unavailable; using legacy edit", draftError);
      }
      const parsed = parseDetails(await requestISCDetails(api, draftId || id));
      if (draftId) {
        loadIntoCreator(
          parsed,
          {
            mode: "EDIT_DRAFT",
            draftId,
            sourceId: id,
            status: "DRAFT",
            lastAutosavedAt: null,
            autosaveError: null,
          },
          `/isc/creator/edit/${id}`
        );
      } else {
        // Legacy fallback: keep source id so publish uses the update path.
        parsed.visRef.edit = true;
        sessionStorage.setItem(
          SESSION_ISC,
          JSON.stringify({ ...parsed, id })
        );
        navigate(`/isc/creator/edit/${id}`);
      }
    } catch (error) {
      console.error("Error opening indicator for editing", error);
      enqueueSnackbar("Could not open this indicator for editing", {
        variant: "error",
      });
      setBusyId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!deleteTarget) return;
    const life = lifecycleOf(deleteTarget);
    try {
      if (life.key === "saved") {
        await requestDeleteISC(api, deleteTarget.id);
        enqueueSnackbar("Indicator deleted successfully", { variant: "success" });
      } else {
        await discardDraft(api, deleteTarget.id);
        enqueueSnackbar("Draft discarded", { variant: "success" });
      }
      setDeleteTarget(null);
      loadMyISCList(params);
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Could not complete that action", { variant: "error" });
    }
  };

  const handleCreateNew = () => {
    // Leaves any existing backend draft intact (it remains visible in the list);
    // only clears the local recovery copy. Confirm-before-discard is Phase A.
    sessionStorage.removeItem(SESSION_ISC);
    navigate("/isc/creator");
  };

  const isEmpty = !loading && indicatorList.length === 0;
  const searching = Boolean(params.search.trim());

  const removeDialog = (() => {
    if (!deleteTarget) return { title: "", content: "", confirmLabel: "" };
    const life = lifecycleOf(deleteTarget);
    if (life.key === "saved") {
      return {
        title: "Delete indicator?",
        content: "This will delete the indicator permanently from your dashboard.",
        confirmLabel: "Delete indicator",
      };
    }
    if (life.key === "editDraft") {
      return {
        title: "Discard changes?",
        content: "Discard these changes? The saved ISC will remain unchanged.",
        confirmLabel: "Discard changes",
      };
    }
    return {
      title: "Discard draft?",
      content: "Discard this draft? This will delete the unfinished ISC draft.",
      confirmLabel: "Discard draft",
    };
  })();

  // Lifecycle-aware action buttons (always visible, keyboard-accessible).
  const renderActions = (item) => {
    const life = lifecycleOf(item);
    const stop = (fn) => (e) => {
      e.stopPropagation();
      fn();
    };
    const disabled = Boolean(busyId);
    const name = item.indicatorName;

    if (life.key === "saved") {
      return (
        <Stack direction="row" gap={0.5} alignItems="center">
          <Tooltip arrow title="Preview">
            <span>
              <IconButton
                size="small"
                color="primary"
                aria-label={`Preview ${name}`}
                onClick={stop(() => handlePreview(item.id))}
                disabled={disabled}
              >
                <PreviewIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip arrow title="Edit">
            <span>
              <IconButton
                size="small"
                color="primary"
                aria-label={`Edit ${name}`}
                onClick={stop(() => handleEditIndicator(item.id))}
                disabled={disabled}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip arrow title="Delete">
            <span>
              <IconButton
                size="small"
                color="error"
                aria-label={`Delete ${name}`}
                onClick={stop(() => setDeleteTarget(item))}
                disabled={disabled}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      );
    }

    // draft or editDraft
    const isEdit = life.key === "editDraft";
    return (
      <Stack direction="row" gap={0.5} alignItems="center">
        <Tooltip arrow title={isEdit ? "Continue editing" : "Continue"}>
          <span>
            <IconButton
              size="small"
              color="primary"
              aria-label={`${isEdit ? "Continue editing" : "Continue"} ${name}`}
              onClick={stop(() => handleContinueDraft(item))}
              disabled={disabled}
            >
              <PlayArrowRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {isEdit && item.sourceId && (
          <Tooltip arrow title="Preview saved version">
            <span>
              <IconButton
                size="small"
                color="primary"
                aria-label={`Preview saved version of ${name}`}
                onClick={stop(() => handlePreviewSource(item.sourceId))}
                disabled={disabled}
              >
                <PreviewIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip arrow title={isEdit ? "Discard changes" : "Discard draft"}>
          <span>
            <IconButton
              size="small"
              color="error"
              aria-label={`${isEdit ? "Discard changes for" : "Discard draft"} ${name}`}
              onClick={stop(() => setDeleteTarget(item))}
              disabled={disabled}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
  };

  // Primary click target (whole row/card): Preview for saved, Continue for drafts.
  const handlePrimary = (item) => {
    const life = lifecycleOf(item);
    if (life.key === "saved") handlePreview(item.id);
    else handleContinueDraft(item);
  };

  const metaChips = (item) => {
    const life = lifecycleOf(item);
    const date = item.updatedOn || item.createdOn;
    const dateLabel = item.updatedOn ? "Updated" : "Created";
    return (
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Chip size="small" color={life.color} variant="outlined" label={life.label} />
        {item.visualizationType && (
          <Chip
            size="small"
            variant="outlined"
            icon={<InsightsOutlinedIcon />}
            label={item.visualizationType}
          />
        )}
        {item.datasetRows != null && item.datasetColumns != null && (
          <Chip
            size="small"
            variant="outlined"
            icon={<TableChartOutlinedIcon />}
            label={`${item.datasetRows}×${item.datasetColumns}`}
          />
        )}
        <Typography variant="body2" color="text.secondary">
          {dateLabel} {formatDate(date)}
        </Typography>
        {item.createdBy && (
          <Stack direction="row" gap={0.5} alignItems="center" sx={{ color: "text.secondary" }}>
            <PersonOutlineRoundedIcon fontSize="inherit" />
            <Typography variant="body2">{item.createdBy}</Typography>
          </Stack>
        )}
      </Stack>
    );
  };

  return (
    <Stack gap={2}>
      {/* Control bar */}
      <Paper variant="outlined" sx={(t) => ({ p: 2, borderRadius: `${t.custom?.radii?.card ?? 8}px` })}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid size={{ xs: 12, md: "auto" }}>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              color="primary"
              onClick={handleCreateNew}
            >
              Create new ISC
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: "auto" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              gap={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <TextField
                size="small"
                label="Search"
                placeholder="Search by name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="isc-filter-label">Show</InputLabel>
                <Select
                  labelId="isc-filter-label"
                  label="Show"
                  value={params.status}
                  onChange={handleFilterChange}
                >
                  {FILTER_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="isc-sort-label">Sort</InputLabel>
                <Select
                  labelId="isc-sort-label"
                  label="Sort"
                  value={sort}
                  onChange={handleSortChange}
                >
                  {SORT_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={view}
                onChange={(e, v) => v && setView(v)}
                aria-label="View mode"
              >
                <ToggleButton value="list" aria-label="List view">
                  <ViewListRoundedIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="cards" aria-label="Card view">
                  <GridViewRoundedIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {loading && <LinearProgress />}

      {isEmpty && (
        <Paper
          variant="outlined"
          sx={(t) => ({ p: 6, textAlign: "center", borderRadius: `${t.custom?.radii?.card ?? 8}px` })}
        >
          {searching ? (
            <Stack gap={1} alignItems="center">
              <SearchOffRoundedIcon color="disabled" fontSize="large" />
              <Typography color="text.secondary">No ISCs match this search.</Typography>
            </Stack>
          ) : (
            <Stack gap={1.5} alignItems="center">
              <InsightsOutlinedIcon color="disabled" fontSize="large" />
              <Typography variant="h6">No ISCs yet.</Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
                Create your first Indicator Specification Card to prototype an
                indicator before implementing it.
              </Typography>
              <Button startIcon={<AddIcon />} variant="contained" onClick={handleCreateNew}>
                Create new ISC
              </Button>
            </Stack>
          )}
        </Paper>
      )}

      {/* List view */}
      {!isEmpty && view === "list" && (
        <Stack gap={1}>
          {indicatorList.map((item) => (
            <Paper
              key={item.id}
              variant="outlined"
              sx={(t) => ({
                borderRadius: `${t.custom?.radii?.card ?? 8}px`,
                overflow: "hidden",
                "&:hover": { borderColor: t.palette.primary.main },
              })}
            >
              <Grid container alignItems="center">
                <Grid size="grow">
                  <CardActionArea
                    onClick={() => handlePrimary(item)}
                    aria-label={`Open ${item.indicatorName}`}
                    sx={{ p: 1.5 }}
                  >
                    <Typography fontWeight={600}>
                      {toSentenceCase(item.indicatorName)}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>{metaChips(item)}</Box>
                  </CardActionArea>
                </Grid>
                <Grid size="auto" sx={{ pr: 1.5 }}>
                  {renderActions(item)}
                </Grid>
              </Grid>
              {busyId === item.id && <LinearProgress />}
            </Paper>
          ))}
        </Stack>
      )}

      {/* Card view */}
      {!isEmpty && view === "cards" && (
        <Grid container spacing={2}>
          {indicatorList.map((item) => {
            const life = lifecycleOf(item);
            return (
              <Grid key={item.id} size={{ xs: 12, sm: 6, lg: 4 }} sx={{ display: "flex" }}>
                <Card
                  variant="outlined"
                  sx={(t) => ({
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: `${t.custom?.radii?.card ?? 8}px`,
                  })}
                >
                  <CardActionArea
                    onClick={() => handlePrimary(item)}
                    aria-label={`Open ${item.indicatorName}`}
                  >
                    <Box
                      sx={(t) => ({
                        height: 96,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: alpha(t.palette.primary.main, 0.06),
                      })}
                    >
                      <InsightsOutlinedIcon color="primary" sx={{ fontSize: 36 }} />
                    </Box>
                    <CardContent>
                      <Typography fontWeight={600} noWrap gutterBottom>
                        {toSentenceCase(item.indicatorName)}
                      </Typography>
                      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                        <Chip size="small" color={life.color} variant="outlined" label={life.label} />
                        {item.visualizationType && (
                          <Chip size="small" variant="outlined" label={item.visualizationType} />
                        )}
                        {item.datasetRows != null && item.datasetColumns != null && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`${item.datasetRows}×${item.datasetColumns}`}
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {item.updatedOn ? "Updated" : "Created"}{" "}
                        {formatDate(item.updatedOn || item.createdOn)}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                  <Box sx={{ mt: "auto" }}>
                    <Divider />
                    <Box sx={{ p: 1, display: "flex", justifyContent: "flex-end" }}>
                      {renderActions(item)}
                    </Box>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <TablePagination
        component="div"
        count={totalElements}
        page={params.page}
        onPageChange={handlePageChange}
        rowsPerPage={params.size}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 20, 50]}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        aria-labelledby="isc-remove-title"
        aria-describedby="isc-remove-description"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="isc-remove-title">{removeDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="isc-remove-description">
            {removeDialog.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} variant="outlined" fullWidth>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRemove}
            variant="contained"
            color="error"
            fullWidth
          >
            {removeDialog.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

MyIscTable.propTypes = {
  onStats: PropTypes.func,
};
