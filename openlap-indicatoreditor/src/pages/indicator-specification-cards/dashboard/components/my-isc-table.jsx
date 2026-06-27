import { useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
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
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
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
import CustomDialog from "../../../../common/components/custom-dialog/custom-dialog";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "nameAsc", label: "Name A–Z" },
  { value: "nameDesc", label: "Name Z–A" },
];

const toSentenceCase = (str) =>
  !str ? "" : str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

const formatDate = (time) =>
  new Date(time).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function MyIscTable({ onStats }) {
  const { api, SESSION_ISC } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [indicatorList, setIndicatorList] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  // Server-side params: page, size, and createdOn ordering are honored by the
  // backend. (Name sorting + search are client-side — see notes below.)
  const [params, setParams] = useState({
    page: 0,
    size: 10,
    sortBy: "createdOn",
    sortDirection: "desc",
  });
  const [sort, setSort] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadMyISCList = async (query) => {
    setLoading(true);
    setIndicatorList([]);
    try {
      const response = await requestMyISCs(api, query);
      const content = response.content ?? [];
      setIndicatorList(content);
      setTotalElements(response.totalElements ?? 0);
      // Report real stats up to the dashboard header (no invented numbers).
      const latest = content.reduce(
        (max, i) =>
          !max || new Date(i.createdOn) > new Date(max) ? i.createdOn : max,
        null
      );
      onStats?.({ total: response.totalElements ?? 0, latest });
    } catch {
      enqueueSnackbar("Error requesting my indicators", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Refetch whenever server-side query params change (fixes the previous bug
  // where page/size/sort changes never re-requested data).
  useEffect(() => {
    loadMyISCList(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page, params.size, params.sortBy, params.sortDirection]);

  // Client-side search + name sort over the LOADED page only (the /my endpoint
  // has no search param and cannot sort by indicatorName — it is not a stored
  // field). See report for this limitation.
  const visibleList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = term
      ? indicatorList.filter((i) =>
          (i.indicatorName ?? "").toLowerCase().includes(term)
        )
      : [...indicatorList];
    if (sort === "nameAsc" || sort === "nameDesc") {
      list.sort((a, b) =>
        (a.indicatorName ?? "").localeCompare(b.indicatorName ?? "")
      );
      if (sort === "nameDesc") list.reverse();
    }
    return list;
  }, [indicatorList, searchTerm, sort]);

  const handleSortChange = (event) => {
    const value = event.target.value;
    setSort(value);
    if (value === "newest") {
      setParams((p) => ({ ...p, sortBy: "createdOn", sortDirection: "desc", page: 0 }));
    } else if (value === "oldest") {
      setParams((p) => ({ ...p, sortBy: "createdOn", sortDirection: "asc", page: 0 }));
    }
    // name sorts are applied client-side without refetching.
  };

  const handlePageChange = (event, newPage) =>
    setParams((p) => ({ ...p, page: newPage }));

  const handleRowsPerPageChange = (event) =>
    setParams((p) => ({ ...p, size: parseInt(event.target.value, 10), page: 0 }));

  const handlePreview = (id) => navigate(`/isc/${id}`);

  // Edit bootstrap preserved verbatim (parse slices, mark visRef.edit, write the
  // draft, navigate to the edit route) — keyed by the row's OWN id.
  const handleEditIndicator = async (id) => {
    setEditingId(id);
    try {
      const responseData = await requestISCDetails(api, id);
      const parsedData = JSON.parse(JSON.stringify(responseData));
      parsedData.requirements = JSON.parse(parsedData.requirements);
      parsedData.dataset = JSON.parse(parsedData.dataset);
      parsedData.visRef = JSON.parse(parsedData.visRef);
      parsedData.lockedStep = JSON.parse(parsedData.lockedStep);
      parsedData.visRef.edit = true;
      sessionStorage.setItem(SESSION_ISC, JSON.stringify(parsedData));
      navigate(`/isc/creator/edit/${id}`);
    } catch (error) {
      console.error("Error requesting indicator details", error);
      enqueueSnackbar("Could not open this indicator for editing", {
        variant: "error",
      });
    } finally {
      setEditingId(null);
    }
  };

  const handleOpenDelete = (indicator) => setDeleteTarget(indicator);
  const handleCloseDelete = () => setDeleteTarget(null);

  const handleDeleteIndicator = async () => {
    if (!deleteTarget) return;
    try {
      await requestDeleteISC(api, deleteTarget.id);
      enqueueSnackbar("Indicator deleted successfully", { variant: "success" });
      handleCloseDelete();
      loadMyISCList(params);
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Could not delete this indicator", { variant: "error" });
    }
  };

  // "Create new ISC" keeps existing behavior: clear any draft, then open the
  // creator. (Confirm-before-discard belongs to Phase A — see report.)
  const handleCreateNew = () => {
    sessionStorage.removeItem(SESSION_ISC);
    navigate("/isc/creator");
  };

  const isEmpty = !loading && visibleList.length === 0;
  const searching = Boolean(searchTerm.trim());

  // Actions block. `stop` prevents the wrapping clickable row/card from also
  // triggering Preview when an action button is pressed.
  const renderActions = (indicator) => {
    const stop = (fn) => (e) => {
      e.stopPropagation();
      fn();
    };
    return (
      <Stack direction="row" gap={0.5} alignItems="center">
        <Tooltip arrow title="Preview">
          <span>
            <IconButton
              size="small"
              color="primary"
              aria-label={`Preview ${indicator.indicatorName}`}
              onClick={stop(() => handlePreview(indicator.id))}
              disabled={Boolean(editingId)}
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
              aria-label={`Edit ${indicator.indicatorName}`}
              onClick={stop(() => handleEditIndicator(indicator.id))}
              disabled={Boolean(editingId)}
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
              aria-label={`Delete ${indicator.indicatorName}`}
              onClick={stop(() => handleOpenDelete(indicator))}
              disabled={Boolean(editingId)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
  };

  return (
    <Stack gap={2}>
      {/* Control bar: Create (left) · search/sort/view (right) */}
      <Paper
        variant="outlined"
        sx={(t) => ({ p: 2, borderRadius: `${t.custom?.radii?.card ?? 8}px` })}
      >
        <Grid
          container
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
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
        {searching && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            Search applies to the currently loaded page.
          </Typography>
        )}
      </Paper>

      {loading && <LinearProgress />}

      {/* Empty / no-results states */}
      {isEmpty && (
        <Paper
          variant="outlined"
          sx={(t) => ({
            p: 6,
            textAlign: "center",
            borderRadius: `${t.custom?.radii?.card ?? 8}px`,
          })}
        >
          {searching ? (
            <Stack gap={1} alignItems="center">
              <SearchOffRoundedIcon color="disabled" fontSize="large" />
              <Typography color="text.secondary">
                No ISCs match this search on the current page.
              </Typography>
            </Stack>
          ) : (
            <Stack gap={1.5} alignItems="center">
              <InsightsOutlinedIcon color="disabled" fontSize="large" />
              <Typography variant="h6">No ISCs yet.</Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
                Create your first Indicator Specification Card to prototype an
                indicator before implementing it.
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={handleCreateNew}
              >
                Create new ISC
              </Button>
            </Stack>
          )}
        </Paper>
      )}

      {/* List view — whole row opens Preview; action buttons are separate */}
      {!isEmpty && view === "list" && (
        <Stack gap={1}>
          {visibleList.map((indicator) => (
            <Paper
              key={indicator.id}
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
                    onClick={() => handlePreview(indicator.id)}
                    aria-label={`Preview ${indicator.indicatorName}`}
                    sx={{ p: 1.5 }}
                  >
                    <Stack
                      direction="row"
                      gap={1}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Typography fontWeight={600}>
                        {toSentenceCase(indicator.indicatorName)}
                      </Typography>
                      <Chip
                        size="small"
                        color="success"
                        variant="outlined"
                        label="Saved"
                      />
                    </Stack>
                    <Stack
                      direction="row"
                      gap={1.5}
                      alignItems="center"
                      flexWrap="wrap"
                      sx={{ mt: 0.5 }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Created {formatDate(indicator.createdOn)}
                      </Typography>
                      {indicator.createdBy && (
                        <Stack
                          direction="row"
                          gap={0.5}
                          alignItems="center"
                          sx={{ color: "text.secondary" }}
                        >
                          <PersonOutlineRoundedIcon fontSize="inherit" />
                          <Typography variant="body2">
                            {indicator.createdBy}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </CardActionArea>
                </Grid>
                <Grid size="auto" sx={{ pr: 1.5 }}>
                  {renderActions(indicator)}
                </Grid>
              </Grid>
              {editingId === indicator.id && <LinearProgress />}
            </Paper>
          ))}
        </Stack>
      )}

      {/* Card view */}
      {!isEmpty && view === "cards" && (
        <Grid container spacing={2}>
          {visibleList.map((indicator) => (
            <Grid
              key={indicator.id}
              size={{ xs: 12, sm: 6, lg: 4 }}
              sx={{ display: "flex" }}
            >
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
                  onClick={() => handlePreview(indicator.id)}
                  aria-label={`Preview ${indicator.indicatorName}`}
                >
                  <Box
                    sx={(t) => ({
                      height: 104,
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: alpha(t.palette.primary.main, 0.06),
                    })}
                  >
                    <InsightsOutlinedIcon color="primary" sx={{ fontSize: 40 }} />
                    <Chip
                      size="small"
                      label="ISC prototype"
                      sx={{ position: "absolute", top: 8, left: 8 }}
                    />
                  </Box>
                  <CardContent>
                    <Typography fontWeight={600} noWrap gutterBottom>
                      {toSentenceCase(indicator.indicatorName)}
                    </Typography>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      <Chip
                        size="small"
                        color="success"
                        variant="outlined"
                        label="Saved"
                      />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(indicator.createdOn)}
                      </Typography>
                    </Stack>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ mt: "auto" }}>
                  <Divider />
                  <Box
                    sx={{
                      p: 1,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    {renderActions(indicator)}
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
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

      <CustomDialog
        type="delete"
        content="This will delete the indicator permanently from your dashboard."
        open={Boolean(deleteTarget)}
        toggleOpen={handleCloseDelete}
        handler={handleDeleteIndicator}
      />
    </Stack>
  );
}

MyIscTable.propTypes = {
  onStats: PropTypes.func,
};
