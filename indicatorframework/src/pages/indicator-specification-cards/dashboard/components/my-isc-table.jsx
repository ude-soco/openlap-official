import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, FormControlLabel, IconButton, InputAdornment, Menu, MenuItem, Stack,
  TableCell, TableRow, TableSortLabel, TextField, Tooltip, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { WorkspaceDashboard, WorkspaceStatusChip, WorkspaceTable, WorkspaceToolbar } from "../../../../common/components/workspace-dashboard/workspace-dashboard.jsx";
import { MEDIUM, WIDE, statusColumn, detailColumn, dateColumn, actionColumn, dashboardDateTime } from "../../../../common/components/workspace-dashboard/workspace-dashboard-styles.js";
import { requestDeleteISC, requestMyISCs } from "../utils/dashboard-api.js";
import { discardDraft } from "../../creator/utils/isc-draft-api.js";

import { CommunityCopyBadge } from "../../../../common/components/community-pool/community-copy-badge.jsx";

const SORT_FIELDS = { indicatorName: "ISC", updatedOn: "Last updated" };
const isDraft = (item) => item.status === "DRAFT";
const isEditing = (item) => isDraft(item) && Boolean(item.sourceId || item.draftKind === "EDIT_DRAFT");
const nameOf = (item) => item.indicatorName || "Untitled ISC";
const messageOf = (failure, fallback) => failure?.response?.data?.message || failure?.message || fallback;
const timestampOf = (item) => dashboardDateTime(item.updatedOn || item.createdOn);

export default function MyIscTable({ onStats, draftsOnly = false, onDraftsOnlyChange, onCreate }) {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState({ page: 0, size: 10, sortBy: "updatedOn", sortDirection: "desc", search: "", origin: "" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [menu, setMenu] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [removeError, setRemoveError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery((previous) => previous.search === search ? previous : { ...previous, page: 0, search }), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { setQuery((previous) => previous.page ? { ...previous, page: 0 } : previous); }, [draftsOnly]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    requestMyISCs(api, { ...query, status: draftsOnly ? "DRAFT" : "" }).then((result) => {
      if (!active) return;
      setRows(result.content || []); setTotal(result.totalElements || 0);
      onStats?.({ total: result.totalElements || 0 });
      if (!(result.content || []).length && query.page > 0) setQuery((previous) => ({ ...previous,
        page: Math.max(0, Math.ceil(result.totalElements / previous.size) - 1) }));
    }).catch((failure) => { if (active) setError(messageOf(failure, "Could not load your ISCs. Please try again.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, query, draftsOnly, reload, onStats]);

  const sort = (sortBy) => setQuery((previous) => ({ ...previous, page: 0, sortBy,
    sortDirection: previous.sortBy === sortBy && previous.sortDirection === "asc" ? "desc" : "asc" }));
  const header = (field, label) => <TableSortLabel active={query.sortBy === field}
    direction={query.sortBy === field ? query.sortDirection : "asc"} onClick={() => sort(field)}>{label}</TableSortLabel>;
  const openRemove = (item) => { setMenu(null); setRemoveError(""); setRemoveTarget(item); };
  const confirmRemove = async () => {
    if (busy || !removeTarget) return;
    setBusy(true); setRemoveError("");
    try {
      if (isDraft(removeTarget)) await discardDraft(api, removeTarget.id);
      else await requestDeleteISC(api, removeTarget.id);
      enqueueSnackbar(isDraft(removeTarget) ? "Draft discarded." : "ISC deleted.", { variant: "success" });
      setRemoveTarget(null); setReload((value) => value + 1);
    } catch (failure) { setRemoveError(messageOf(failure, "Could not complete that action. Please try again.")); }
    finally { setBusy(false); }
  };
  const removal = !removeTarget ? null : isEditing(removeTarget) ? {
    title: "Discard changes?", confirm: "Discard changes",
    description: `Discard the unfinished changes to “${nameOf(removeTarget)}”? The saved ISC remains available.`,
  } : isDraft(removeTarget) ? {
    title: "Discard draft?", confirm: "Discard draft",
    description: `This removes the unfinished draft “${nameOf(removeTarget)}”. Saved ISCs remain available.`,
  } : {
    title: "Delete indicator?", confirm: "Delete indicator",
    description: `This permanently deletes the saved ISC “${nameOf(removeTarget)}”.`,
  };
  const filtered = Boolean(query.search || query.origin);

  return <WorkspaceDashboard>
    <WorkspaceToolbar label="ISC controls" onCreate={onCreate} sortFields={SORT_FIELDS} sortBy={query.sortBy}
      sortDirection={query.sortDirection}
      onSortField={(sortBy) => setQuery((previous) => ({ ...previous, page: 0, sortBy, sortDirection: "asc" }))}
      onSortDirection={(sortDirection) => setQuery((previous) => ({ ...previous, page: 0, sortDirection }))}>
      <TextField size="small" label="Search ISCs" placeholder="Search by name" value={search}
        sx={{ flex: "1 1 220px", minWidth: 180 }} onChange={(event) => setSearch(event.target.value)}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
      <TextField select size="small" label="Origin" value={query.origin}
        sx={{ flex: "0 1 160px", minWidth: 140 }}
        onChange={(event) => setQuery((previous) => ({ ...previous, page: 0, origin: event.target.value }))}>
        <MenuItem value="">All origins</MenuItem><MenuItem value="OWN">Created by me</MenuItem>
        <MenuItem value="COMMUNITY">Community copies</MenuItem>
      </TextField>
      <FormControlLabel sx={{ m: 0, flexShrink: 0, whiteSpace: "nowrap" }} label="Drafts only"
        control={<Checkbox checked={draftsOnly} onChange={(event) => {
          setQuery((previous) => ({ ...previous, page: 0 })); onDraftsOnlyChange(event.target.checked);
        }} />} />
    </WorkspaceToolbar>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setReload((value) => value + 1)}>Retry</Button>}>{error}</Alert>}
    <WorkspaceTable label="ISCs" loadingLabel="Loading ISCs" loading={loading} total={total} page={query.page} size={query.size}
      onPageChange={(page) => setQuery((previous) => ({ ...previous, page }))}
      onSizeChange={(size) => setQuery((previous) => ({ ...previous, page: 0, size }))}
      emptyState={!loading && !error && !rows.length && <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 600 }}>{filtered ? "No matching ISCs" : draftsOnly ? "No drafts yet" : "No ISCs yet"}</Typography>
        <Typography variant="body2" color="text.secondary">{filtered ? "Try another name or origin." : "Create an ISC to prototype an indicator."}</Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={onCreate}>Create an ISC</Button>
      </Box>}
      header={<TableRow>
        <TableCell sortDirection={query.sortBy === "indicatorName" ? query.sortDirection : false}>{header("indicatorName", "ISC")}</TableCell>
        <TableCell sx={statusColumn}>Status</TableCell>
        <TableCell sx={detailColumn}>Visualization</TableCell>
        <TableCell sx={dateColumn} sortDirection={query.sortBy === "updatedOn" ? query.sortDirection : false}>{header("updatedOn", "Last updated")}</TableCell>
        <TableCell align="right" sx={actionColumn}>Actions</TableCell>
      </TableRow>}>
      {!error && rows.map((item) => <TableRow key={item.id} hover>
        <TableCell><Stack sx={{ gap: 0.75 }}>
          <Typography sx={{ fontWeight: 600 }}>{nameOf(item)}</Typography>
          {item.communityCopy && <CommunityCopyBadge />}
          <Box sx={{ display: "block", [MEDIUM]: { display: "none" } }}><WorkspaceStatusChip draft={isDraft(item)} /></Box>
          {isEditing(item) && <Typography variant="caption" color="text.secondary">Editing saved ISC</Typography>}
          {item.datasetRows != null && item.datasetColumns != null && <Typography variant="caption" color="text.secondary">
            Dataset: {item.datasetRows} rows · {item.datasetColumns} columns
          </Typography>}
          <Typography variant="caption" sx={{ display: "block", [WIDE]: { display: "none" } }}>{item.visualizationType || "—"}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", [MEDIUM]: { display: "none" } }}>
            {item.updatedOn ? "" : "Created "}{timestampOf(item)}
          </Typography>
        </Stack></TableCell>
        <TableCell sx={statusColumn}><WorkspaceStatusChip draft={isDraft(item)} /></TableCell>
        <TableCell sx={detailColumn}>{item.visualizationType || "—"}</TableCell>
        <TableCell sx={dateColumn}>{item.updatedOn ? "" : "Created "}{timestampOf(item)}</TableCell>
        <TableCell align="right" sx={{ px: 1, [MEDIUM]: { px: 2 } }}>
          <Stack sx={{ flexDirection: "column", [MEDIUM]: { flexDirection: "row" }, alignItems: "flex-end", justifyContent: "flex-end", gap: 0.5 }}>
            <Button disabled={loading || busy} sx={{ whiteSpace: "nowrap", minWidth: "auto", px: 0.5 }}
              startIcon={!isDraft(item) ? <VisibilityIcon fontSize="small" /> : undefined}
              aria-label={`${isDraft(item) ? "Continue" : "Preview"} ${nameOf(item)}`}
              onClick={() => navigate(isDraft(item) ? `/isc/drafts/${encodeURIComponent(item.id)}` : `/isc/${encodeURIComponent(item.id)}`)}>
              {isDraft(item) ? "Continue" : "Preview"}
            </Button>
            <Tooltip title={`Actions for ${nameOf(item)}`}><IconButton disabled={loading || busy} aria-haspopup="menu"
              aria-label={`More actions for ${nameOf(item)}`} onClick={(event) => setMenu({ item, anchor: event.currentTarget })}><MoreVertIcon /></IconButton></Tooltip>
          </Stack>
        </TableCell>
      </TableRow>)}
    </WorkspaceTable>
    <Menu open={Boolean(menu)} anchorEl={menu?.anchor} onClose={() => setMenu(null)}>
      {menu && !isDraft(menu.item) && <MenuItem onClick={() => { navigate(`/isc/${encodeURIComponent(menu.item.id)}/edit`); setMenu(null); }}>Edit</MenuItem>}
      {menu && isEditing(menu.item) && menu.item.sourceId && <MenuItem onClick={() => {
        navigate(`/isc/${encodeURIComponent(menu.item.sourceId)}`); setMenu(null);
      }}>Preview saved version</MenuItem>}
      <MenuItem sx={{ color: "error.main" }} onClick={() => openRemove(menu.item)}>
        {menu && isEditing(menu.item) ? "Discard changes" : menu && isDraft(menu.item) ? "Discard draft" : "Delete"}
      </MenuItem>
    </Menu>
    <Dialog open={Boolean(removeTarget)} onClose={busy ? undefined : () => setRemoveTarget(null)} fullWidth maxWidth="sm"
      aria-labelledby="isc-remove-title" aria-describedby="isc-remove-description">
      <DialogTitle id="isc-remove-title">{removal?.title}</DialogTitle>
      <DialogContent><DialogContentText id="isc-remove-description">{removal?.description}</DialogContentText>
        {removeError && <Alert severity="error" sx={{ mt: 2 }}>{removeError}</Alert>}
      </DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setRemoveTarget(null)}>Cancel</Button>
        <Button disabled={busy} variant="contained" color="error" onClick={confirmRemove}>
          {busy ? isDraft(removeTarget) ? "Discarding…" : "Deleting…" : removal?.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  </WorkspaceDashboard>;
}
MyIscTable.propTypes = { onStats: PropTypes.func, draftsOnly: PropTypes.bool,
  onDraftsOnlyChange: PropTypes.func.isRequired, onCreate: PropTypes.func.isRequired };
