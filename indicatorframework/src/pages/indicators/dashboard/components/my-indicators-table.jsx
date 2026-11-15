import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, FormControlLabel, IconButton, InputAdornment, Menu, MenuItem,
  Stack, TableCell,
  TableRow, TableSortLabel, TextField, Tooltip, Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { createIndicatorDraftApi, draftErrorMessage } from "../../indicator-editor/drafts/indicator-draft-api.js";
import { requestIndicatorCode, requestIndicatorDeletion, requestMyIndicatorDuplication,
  requestMyIndicatorWorkspace } from "../utils/indicator-dashboard-api.js";
import { WorkspaceDashboard, WorkspaceStatusChip, WorkspaceTable, WorkspaceToolbar }
  from "../../../../common/components/workspace-dashboard/workspace-dashboard.jsx";
import { MEDIUM, WIDE, statusColumn, detailColumn, dateColumn, actionColumn, dashboardDateTime }
  from "../../../../common/components/workspace-dashboard/workspace-dashboard-styles.js";

import { CommunityCopyBadge } from "../../../../common/components/community-pool/community-copy-badge.jsx";

const TYPES = { BASIC: "Basic", COMPOSITE: "Composite", MULTI_LEVEL: "Multilevel analysis" };
const SORT_FIELDS = { name: "Indicator", status: "Status", indicatorType: "Type", updatedAt: "Last updated" };
const EDIT_ROUTES = { BASIC: "/indicator/editor/basic/edit", COMPOSITE: "/indicator/editor/composite/edit",
  MULTI_LEVEL: "/indicator/editor/multi-level-analysis/edit" };
const keyOf = (item) => `${item.kind}:${item.id}`;

export default function MyIndicatorsTable({ onStats, draftsOnly = false, onDraftsOnlyChange }) {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState({ page: 0, size: 10, search: "", indicatorType: "", sortBy: "updatedAt", sortDirection: "desc", origin: "" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [menu, setMenu] = useState(null);
  const [action, setAction] = useState(null);
  const [name, setName] = useState("");
  const [busyKey, setBusyKey] = useState(null);
  const [actionError, setActionError] = useState("");
  const [blockedDeletion, setBlockedDeletion] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery((previous) => previous.search === search ? previous : { ...previous, page: 0, search }), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { setQuery((previous) => previous.page ? { ...previous, page: 0 } : previous); }, [draftsOnly]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    requestMyIndicatorWorkspace(api, { ...query, draftsOnly }).then((result) => {
      if (!active) return;
      setRows(result.content || []); setTotal(result.totalElements || 0);
      onStats?.({ total: result.totalElements || 0 });
      if (!(result.content || []).length && query.page > 0) setQuery((previous) => ({ ...previous,
        page: Math.max(0, Math.ceil(result.totalElements / previous.size) - 1) }));
    }).catch((failure) => { if (active) setError(draftErrorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, query, draftsOnly, refresh, onStats]);

  const sort = (sortBy) => setQuery((previous) => ({ ...previous, page: 0, sortBy,
    sortDirection: previous.sortBy === sortBy && previous.sortDirection === "asc" ? "desc" : "asc" }));
  const beginAction = (kind, item) => {
    setMenu(null); setActionError(""); setName(item.name || ""); setAction({ kind, item });
  };
  const savedAction = async (item, kind) => {
    setMenu(null); setBusyKey(keyOf(item));
    try {
      if (kind === "embed") {
        const response = await requestIndicatorCode(api, item.id);
        await navigator.clipboard.writeText(response.data);
        enqueueSnackbar(response.message || "Embed code copied.", { variant: "success" });
      } else {
        const response = await requestMyIndicatorDuplication(api, item.id);
        setRefresh((value) => value + 1);
        enqueueSnackbar(response.message || "Indicator duplicated.", { variant: "success" });
      }
    } catch (failure) { enqueueSnackbar(draftErrorMessage(failure), { variant: "error" }); }
    finally { setBusyKey(null); }
  };
  const finishAction = async () => {
    setBusyKey(keyOf(action.item)); setActionError("");
    try {
      if (action.kind === "delete") await requestIndicatorDeletion(api, action.item.id);
      else {
        const transport = createIndicatorDraftApi(api);
        if (action.kind === "discard") await transport.discard(action.item.id, action.item.revision);
        else {
          const current = await transport.get(action.item.id);
          if (current.revision !== action.item.revision || current.status !== "DRAFT" || current.completionPending) {
            throw new Error("This draft changed since the list was loaded. Close this dialog and refresh the list before renaming it.");
          }
          const configuration = current.indicatorType === "BASIC"
            ? { ...current.configuration, indicator: { ...current.configuration.indicator, indicatorName: name.trim() } }
            : { ...current.configuration, name: name.trim() };
          await transport.update(current.id, { revision: current.revision, clientRequestId: crypto.randomUUID(),
            name: name.trim(), configuration, schemaVersion: current.schemaVersion });
        }
      }
      enqueueSnackbar(action.kind === "rename" ? "Draft renamed." : action.kind === "discard" ? "Draft discarded." : "Indicator deleted.", { variant: "success" });
      setAction(null); setRefresh((value) => value + 1);
    } catch (failure) {
      if (failure?.code === "INDICATOR_IN_USE") {
        setBlockedDeletion({ sourceName: action.item.name, message: failure.message, count: failure.details?.count,
          usedBy: Array.isArray(failure.details?.usedBy) ? failure.details.usedBy.filter((parent) =>
            typeof parent?.id === "string" && typeof parent?.name === "string") : [] });
        setAction(null);
      } else setActionError(draftErrorMessage(failure));
    } finally { setBusyKey(null); }
  };
  const header = (field, label) => <TableSortLabel active={query.sortBy === field} direction={query.sortBy === field ? query.sortDirection : "asc"}
    onClick={() => sort(field)}>{label}</TableSortLabel>;
  const status = (item) => <WorkspaceStatusChip draft={item.kind === "DRAFT"} />;
  const filtered = Boolean(search || query.indicatorType || query.origin);

  return <WorkspaceDashboard>
    <WorkspaceToolbar label="Indicator controls" onCreate={() => navigate("/indicator/editor")}
      sortFields={SORT_FIELDS} sortBy={query.sortBy} sortDirection={query.sortDirection}
      onSortField={(sortBy) => setQuery((previous) => ({ ...previous, page: 0, sortBy, sortDirection: "asc" }))}
      onSortDirection={(sortDirection) => setQuery((previous) => ({ ...previous, page: 0, sortDirection }))}>
        <TextField size="small" label="Search indicators" placeholder="Search by name" value={search} sx={{ flex: "1 1 220px", minWidth: 180 }} onChange={(event) => setSearch(event.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        <TextField select size="small" label="Indicator type" value={query.indicatorType} sx={{ flex: "1 1 180px", minWidth: 160, [WIDE]: { maxWidth: 180 } }}
          onChange={(event) => setQuery((previous) => ({ ...previous, page: 0, indicatorType: event.target.value }))}>
          <MenuItem value="">All types</MenuItem>{Object.entries(TYPES).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Origin" value={query.origin}
          sx={{ flex: "0 1 160px", minWidth: 140 }}
          onChange={(event) => setQuery((previous) => ({ ...previous, page: 0, origin: event.target.value }))}>
          <MenuItem value="">All origins</MenuItem><MenuItem value="OWN">Created by me</MenuItem>
          <MenuItem value="COMMUNITY">Community copies</MenuItem>
        </TextField>
        <FormControlLabel sx={{ m: 0, flexShrink: 0, whiteSpace: "nowrap" }} label="Drafts only" control={<Checkbox checked={draftsOnly} onChange={(event) => {
          setQuery((previous) => ({ ...previous, page: 0 })); onDraftsOnlyChange(event.target.checked);
        }} />} />
    </WorkspaceToolbar>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRefresh((value) => value + 1)}>Retry</Button>}>{error}</Alert>}
    <WorkspaceTable label="Indicators" loading={loading} total={total} page={query.page} size={query.size}
      onPageChange={(page) => setQuery((previous) => ({ ...previous, page }))}
      onSizeChange={(size) => setQuery((previous) => ({ ...previous, page: 0, size }))}
      emptyState={!loading && !rows.length && !error && <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 600 }}>{filtered ? "No matching indicators" : draftsOnly ? "No drafts yet" : "No indicators yet"}</Typography>
        <Typography variant="body2" color="text.secondary">{filtered ? "Try another name or indicator type." : "Start an indicator and your unfinished work will appear here after its first save."}</Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate("/indicator/editor")}>Create an indicator</Button>
      </Box>}
      header={<TableRow>
            <TableCell sortDirection={query.sortBy === "name" ? query.sortDirection : false}>{header("name", "Indicator")}</TableCell>
            <TableCell sx={statusColumn} sortDirection={query.sortBy === "status" ? query.sortDirection : false}>{header("status", "Status")}</TableCell>
            <TableCell sx={detailColumn} sortDirection={query.sortBy === "indicatorType" ? query.sortDirection : false}>{header("indicatorType", "Type")}</TableCell>
            <TableCell sx={dateColumn} sortDirection={query.sortBy === "updatedAt" ? query.sortDirection : false}>{header("updatedAt", "Last updated")}</TableCell>
            <TableCell align="right" sx={actionColumn}>Actions</TableCell>
          </TableRow>}>
          {!error && rows.map((item) => <TableRow key={keyOf(item)} hover>
            <TableCell><Stack sx={{ gap: 0.75 }}>
              <Typography sx={{ fontWeight: 600 }}>{item.name}</Typography>
              {item.communityCopy && <CommunityCopyBadge />}
              <Box sx={{ display: "block", [MEDIUM]: { display: "none" } }}>{status(item)}</Box>
              {item.kind === "DRAFT" && item.sourceIndicatorId && <Typography variant="caption" color="text.secondary">Editing saved indicator</Typography>}
              {item.recoverable === false && <Typography variant="caption" color="text.secondary">Older draft needs review</Typography>}
              {item.completionPending && <Typography variant="caption" color="text.secondary">Continue to confirm the previous save</Typography>}
              <Typography variant="caption" sx={{ display: "block", [WIDE]: { display: "none" } }}>{TYPES[item.indicatorType] || item.indicatorType}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", [MEDIUM]: { display: "none" } }}>{dashboardDateTime(item.updatedAt)}</Typography>
            </Stack></TableCell>
            <TableCell sx={statusColumn}>{status(item)}</TableCell>
            <TableCell sx={detailColumn}>{TYPES[item.indicatorType] || item.indicatorType}</TableCell>
            <TableCell sx={dateColumn}>{dashboardDateTime(item.updatedAt)}</TableCell>
            <TableCell align="right" sx={{ px: 1, [MEDIUM]: { px: 2 } }}><Stack sx={{ flexDirection: "column", [MEDIUM]: { flexDirection: "row" }, alignItems: "flex-end", justifyContent: "flex-end", gap: 0.5 }}>
              <Button sx={{ whiteSpace: "nowrap", minWidth: "auto", px: 0.5 }} disabled={loading || Boolean(busyKey) || item.recoverable === false}
                startIcon={item.kind === "SAVED" ? <VisibilityIcon fontSize="small" /> : undefined} aria-label={`${item.kind === "SAVED" ? "Preview" : "Continue"} ${item.name}`}
                onClick={() => navigate(item.kind === "DRAFT" ? `/indicator/editor/drafts/${encodeURIComponent(item.id)}` : `/indicator/${encodeURIComponent(item.id)}`)}>
                {item.kind === "DRAFT" ? "Continue" : "Preview"}
              </Button>
              <Tooltip title={`Actions for ${item.name}`}><IconButton disabled={loading || Boolean(busyKey)} aria-haspopup="menu"
                aria-label={`${item.kind === "DRAFT" ? "Actions" : "More actions"} for ${item.name}`} onClick={(event) => setMenu({ item, anchor: event.currentTarget })}><MoreVertIcon /></IconButton></Tooltip>
            </Stack></TableCell>
          </TableRow>)}
    </WorkspaceTable>
    <Menu open={Boolean(menu)} anchorEl={menu?.anchor} onClose={() => setMenu(null)}>
      {menu?.item.kind === "DRAFT" ? [
        <MenuItem key="rename" disabled={menu.item.recoverable === false || menu.item.completionPending} onClick={() => beginAction("rename", menu.item)}>Rename draft</MenuItem>,
        <MenuItem key="discard" disabled={menu.item.completionPending} onClick={() => beginAction("discard", menu.item)} sx={{ color: "error.main" }}>Discard draft</MenuItem>,
      ] : [
        <MenuItem key="edit" onClick={() => { navigate(`${EDIT_ROUTES[menu.item.indicatorType]}/${encodeURIComponent(menu.item.id)}`); setMenu(null); }}>Edit</MenuItem>,
        <MenuItem key="embed" onClick={() => savedAction(menu.item, "embed")}>Copy embed code</MenuItem>,
        <MenuItem key="duplicate" onClick={() => savedAction(menu.item, "duplicate")}>Duplicate</MenuItem>,
        <MenuItem key="delete" onClick={() => beginAction("delete", menu.item)} sx={{ color: "error.main" }}>Delete</MenuItem>,
      ]}
    </Menu>
    <Dialog open={Boolean(action)} onClose={busyKey ? undefined : () => setAction(null)} fullWidth maxWidth="sm" aria-labelledby="indicator-list-action-title"
      aria-describedby={action?.kind === "rename" ? undefined : "indicator-list-action-description"}>
      <DialogTitle id="indicator-list-action-title">{action?.kind === "discard" ? "Discard this draft?" : action?.kind === "delete" ? "Are you sure?" : "Rename draft"}</DialogTitle>
      <DialogContent><Stack sx={{ gap: 2, pt: 1 }}>{action?.kind === "rename"
        ? <TextField autoFocus fullWidth label="Draft name" value={name} disabled={Boolean(busyKey)} onChange={(event) => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />
        : <DialogContentText id="indicator-list-action-description">{action?.kind === "discard" ? `This removes “${action.item.name}” from your unfinished work. Any previously saved indicator and its embeds stay unchanged.`
          : `This permanently deletes “${action?.item.name}”. Its embedded charts will no longer be available.`}</DialogContentText>}
        {actionError && <Alert severity="error">{actionError}</Alert>}</Stack></DialogContent>
      <DialogActions><Button disabled={Boolean(busyKey)} onClick={() => setAction(null)}>Cancel</Button>
        <Button variant="contained" color={action?.kind === "rename" ? "primary" : "error"} disabled={Boolean(busyKey) || (action?.kind === "rename" && !name.trim())}
          onClick={finishAction}>{busyKey ? action?.kind === "discard" ? "Discarding…" : action?.kind === "delete" ? "Deleting…" : "Saving…"
            : action?.kind === "discard" ? "Discard draft" : action?.kind === "delete" ? "Confirm delete" : "Save name"}</Button></DialogActions>
    </Dialog>
    <Dialog open={Boolean(blockedDeletion)} onClose={() => setBlockedDeletion(null)} fullWidth maxWidth="sm" aria-labelledby="indicator-in-use-title" aria-describedby="indicator-in-use-description">
      <DialogTitle id="indicator-in-use-title">Cannot delete indicator</DialogTitle>
      <DialogContent>
        <DialogContentText id="indicator-in-use-description">{blockedDeletion?.message || "This indicator is used by a complex indicator. Remove or replace that source first."}</DialogContentText>
        <Typography variant="body2" sx={{ mt: 2 }}>{blockedDeletion?.sourceName} is still available in your dashboard.</Typography>
        {blockedDeletion?.usedBy.length > 0 && <Stack component="ul" sx={{ pl: 0, mt: 2, mb: 0, listStyle: "none", gap: 1 }}>
          {blockedDeletion.usedBy.map((parent) => <Box component="li" key={parent.id}><Button startIcon={<VisibilityIcon />}
            aria-label={`Preview dependent indicator ${parent.name}`} sx={{ justifyContent: "flex-start", textAlign: "left", textTransform: "none" }}
            onClick={() => { setBlockedDeletion(null); navigate(`/indicator/${encodeURIComponent(parent.id)}`); }}>{parent.name}</Button></Box>)}
        </Stack>}
        {blockedDeletion?.count > blockedDeletion?.usedBy.length && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Additional indicators also depend on this source.</Typography>}
      </DialogContent>
      <DialogActions><Button onClick={() => setBlockedDeletion(null)} autoFocus>Close</Button></DialogActions>
    </Dialog>
  </WorkspaceDashboard>;
}
MyIndicatorsTable.propTypes = { onStats: PropTypes.func, draftsOnly: PropTypes.bool, onDraftsOnlyChange: PropTypes.func.isRequired };
