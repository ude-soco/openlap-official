import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
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
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CodeIcon from "@mui/icons-material/Code";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import {
  requestIndicatorCode,
  requestIndicatorDeletion,
  requestIndicatorFullDetail,
  requestMyIndicatorDuplication,
  requestMyIndicators,
} from "../utils/indicator-dashboard-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { handleDisplayType } from "../utils/utils.js";
import CustomDialog from "../../../../common/components/custom-dialog/custom-dialog.jsx";
import EmptyState from "../../../../common/components/empty-state/empty-state.jsx";

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

// Edit routing is keyed by indicator type (server contract preserved).
const EDIT_ROUTES = {
  BASIC: "/indicator/editor/basic/edit",
  COMPOSITE: "/indicator/editor/composite/edit",
  MULTI_LEVEL: "/indicator/editor/multi-level-analysis/edit",
};

const ICC_TOOLTIP = (
  <>
    <Typography gutterBottom>Copy embed code (ICC)</Typography>
    <Typography variant="body2">
      An Interactive Indicator Code (ICC) is an iframe snippet you can embed in
      any web app that supports iframes, to show this indicator live.
    </Typography>
  </>
);

const MyIndicatorsTable = ({ onStats }) => {
  const { api, SESSION_INDICATOR } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [indicatorList, setIndicatorList] = useState([]);
  const [pageable, setPageable] = useState({ pageSize: 10, pageNumber: 0 });
  const [totalElements, setTotalElements] = useState(0);
  // Server contract preserved verbatim: sortDirection "dsc", sortBy "createdOn".
  const [params, setParams] = useState({
    page: 0,
    size: 10,
    sortDirection: "dsc",
    sortBy: "createdOn",
  });
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(undefined); // per-row action in progress
  const [searchTerm, setSearchTerm] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [view, setView] = useState("list");
  const [menu, setMenu] = useState({ anchorEl: null, item: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadMyIndicatorList = async () => {
    setLoading(true);
    try {
      const result = await requestMyIndicators(api, params);
      setIndicatorList(result.content);
      setPageable(result.pageable);
      setTotalElements(result.totalElements);
      if (onStats) onStats({ total: result.totalElements });
    } catch (error) {
      console.error("Error requesting my indicators", error);
      enqueueSnackbar("Could not load your indicators. Please try again.", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyIndicatorList();
    // Reload when paging/size changes; client-side name filter is applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Client-side name filter over the current page (behaviour preserved).
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFiltered(
      indicatorList.filter((i) =>
        (i.indicatorName || "").toLowerCase().includes(term)
      )
    );
  }, [searchTerm, indicatorList]);

  const closeMenu = () => setMenu({ anchorEl: null, item: null });

  const handleCreateNew = () => {
    sessionStorage.removeItem(SESSION_INDICATOR);
    navigate("/indicator/editor");
  };

  const handlePreview = (id) => navigate(`/indicator/${id}`);

  const handleEditIndicator = async (item) => {
    setBusyId(item.id);
    try {
      const indicator = await requestIndicatorFullDetail(api, item.id);
      const configuration = JSON.parse(indicator.configuration);
      sessionStorage.setItem(
        SESSION_INDICATOR,
        JSON.stringify({
          ...configuration,
          indicator: { ...configuration.indicator, id: item.id },
        })
      );
      const baseRoute = EDIT_ROUTES[indicator.type];
      navigate(`${baseRoute}/${item.id}`);
    } catch (error) {
      console.error("Error opening indicator for editing", error);
      enqueueSnackbar("Could not open this indicator for editing.", {
        variant: "error",
      });
    } finally {
      setBusyId(undefined);
    }
  };

  const handleCopyEmbedCode = async (item) => {
    setBusyId(item.id);
    try {
      const indicatorCode = await requestIndicatorCode(api, item.id);
      await navigator.clipboard.writeText(indicatorCode.data);
      enqueueSnackbar(indicatorCode.message, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message || "Could not copy the embed code.",
        { variant: "error" }
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const handleDuplicate = async (item) => {
    setBusyId(item.id);
    try {
      const response = await requestMyIndicatorDuplication(api, item.id);
      await loadMyIndicatorList();
      enqueueSnackbar(response.message, { variant: "success" });
    } catch (error) {
      console.error("Error duplicating indicator", error);
      enqueueSnackbar("Could not duplicate this indicator.", {
        variant: "error",
      });
    } finally {
      setBusyId(undefined);
    }
  };

  const handleDeleteIndicator = async () => {
    const item = deleteTarget;
    if (!item) return;
    setBusyId(item.id);
    try {
      const response = await requestIndicatorDeletion(api, item.id);
      setIndicatorList((prev) => prev.filter((i) => i.id !== item.id));
      enqueueSnackbar(response.message, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error?.message || "Could not delete this indicator.", {
        variant: "error",
      });
    } finally {
      setBusyId(undefined);
      setDeleteTarget(null);
    }
  };

  const handlePageChange = (event, newPage) =>
    setParams((p) => ({ ...p, page: newPage }));

  const handleRowsPerPageChange = (event) =>
    setParams((p) => ({ ...p, size: parseInt(event.target.value, 10), page: 0 }));

  const isSearching = searchTerm.trim().length > 0;
  const isEmpty = !loading && filtered.length === 0;

  // Consistent action area for every row/card: primary "Preview" + overflow menu.
  const renderActions = (item) => {
    const busy = busyId === item.id;
    const name = item.indicatorName;
    return (
      <Stack direction="row" gap={0.5} alignItems="center">
        <Button
          variant="text"
          size="small"
          color="primary"
          startIcon={<VisibilityIcon fontSize="small" />}
          aria-label={`Preview ${name}`}
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            handlePreview(item.id);
          }}
        >
          Preview
        </Button>
        <Tooltip arrow title="More actions">
          <span>
            <IconButton
              size="small"
              aria-label={`More actions for ${name}`}
              aria-haspopup="true"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setMenu({ anchorEl: e.currentTarget, item });
              }}
            >
              <MoreVertRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
  };

  const menuItemsFor = (item) => {
    if (!item) return [];
    const withClose = (fn) => () => {
      closeMenu();
      fn();
    };
    return [
      {
        key: "edit",
        label: "Edit",
        icon: <EditIcon fontSize="small" />,
        onClick: withClose(() => handleEditIndicator(item)),
      },
      {
        key: "copy",
        label: "Copy embed code",
        icon: <CodeIcon fontSize="small" />,
        tooltip: ICC_TOOLTIP,
        onClick: withClose(() => handleCopyEmbedCode(item)),
      },
      {
        key: "duplicate",
        label: "Duplicate",
        icon: <ContentCopyIcon fontSize="small" />,
        onClick: withClose(() => handleDuplicate(item)),
      },
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteIcon fontSize="small" color="error" />,
        destructive: true,
        onClick: withClose(() => setDeleteTarget(item)),
      },
    ];
  };

  const metaChips = (item) => (
    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
      <Chip
        size="small"
        variant="outlined"
        icon={<InsightsOutlinedIcon />}
        label={handleDisplayType(item.type)}
      />
      <Typography variant="body2" color="text.secondary">
        Created {formatDate(item.createdOn)}
      </Typography>
    </Stack>
  );

  return (
    <Stack gap={2}>
      {/* Control bar */}
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
              Create new
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

      {isEmpty &&
        (isSearching ? (
          <EmptyState
            icon={SearchOffRoundedIcon}
            title="No indicators match your search"
            description="Try a different name, or clear the search to see all your indicators."
          />
        ) : (
          <EmptyState
            icon={InsightsOutlinedIcon}
            title="No indicators yet"
            description="An indicator turns your learning data into a chart you can read and reuse. Create your first one to get started."
            action={
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateNew}
              >
                Create new
              </Button>
            }
          />
        ))}

      {/* List view */}
      {!isEmpty && view === "list" && (
        <Stack gap={1}>
          {filtered.map((item) => (
            <Paper
              key={item.id}
              variant="outlined"
              sx={(t) => ({
                borderRadius: `${t.custom?.radii?.card ?? 8}px`,
                overflow: "hidden",
              })}
            >
              <Grid container alignItems="center">
                <Grid size="grow">
                  <Box sx={{ p: 1.5 }}>
                    <Typography fontWeight={600}>
                      {toSentenceCase(item.indicatorName)}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>{metaChips(item)}</Box>
                  </Box>
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
          {filtered.map((item) => (
            <Grid
              key={item.id}
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
                  onClick={() => handlePreview(item.id)}
                  aria-label={`Preview ${item.indicatorName}`}
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
                    <InsightsOutlinedIcon
                      color="primary"
                      sx={{ fontSize: 36 }}
                    />
                  </Box>
                  <CardContent>
                    <Typography fontWeight={600} noWrap gutterBottom>
                      {toSentenceCase(item.indicatorName)}
                    </Typography>
                    <Stack
                      direction="row"
                      gap={1}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<InsightsOutlinedIcon />}
                        label={handleDisplayType(item.type)}
                      />
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Created {formatDate(item.createdOn)}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ mt: "auto" }}>
                  {busyId === item.id && <LinearProgress />}
                  <Divider />
                  <Box sx={{ p: 1, display: "flex", justifyContent: "flex-end" }}>
                    {renderActions(item)}
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
        page={pageable.pageNumber}
        onPageChange={handlePageChange}
        rowsPerPage={pageable.pageSize}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 20, 50]}
      />

      <Menu
        anchorEl={menu.anchorEl}
        open={Boolean(menu.anchorEl && menu.item)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {menuItemsFor(menu.item).map((mi) => (
          <MenuItem
            key={mi.key}
            onClick={mi.onClick}
            sx={mi.destructive ? { color: "error.main" } : undefined}
          >
            <ListItemIcon>{mi.icon}</ListItemIcon>
            {mi.tooltip ? (
              <Tooltip arrow placement="right" title={mi.tooltip}>
                <ListItemText>{mi.label}</ListItemText>
              </Tooltip>
            ) : (
              <ListItemText>{mi.label}</ListItemText>
            )}
          </MenuItem>
        ))}
      </Menu>

      <CustomDialog
        type="delete"
        content="This will delete the indicator permanently from your dashboard."
        open={Boolean(deleteTarget)}
        toggleOpen={() => setDeleteTarget(null)}
        handler={handleDeleteIndicator}
      />
    </Stack>
  );
};

MyIndicatorsTable.propTypes = {
  onStats: PropTypes.func,
};

export default MyIndicatorsTable;
