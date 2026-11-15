import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, FormControlLabel, IconButton, InputAdornment, LinearProgress, Menu, MenuItem,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TableSortLabel, TextField, Tooltip, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { createIndicatorDraftApi, draftErrorMessage } from "../../indicator-editor/drafts/indicator-draft-api.js";
import { requestIndicatorCode, requestIndicatorDeletion, requestMyIndicatorDuplication,
  requestMyIndicatorWorkspace } from "../utils/indicator-dashboard-api.js";

const TYPES = { BASIC: "Basic", COMPOSITE: "Composite", MULTI_LEVEL: "Multilevel analysis" };
const SORT_FIELDS = { name: "Indicator", status: "Status", indicatorType: "Type", updatedAt: "Last updated" };
const EDIT_ROUTES = { BASIC: "/indicator/editor/basic/edit", COMPOSITE: "/indicator/editor/composite/edit",
  MULTI_LEVEL: "/indicator/editor/multi-level-analysis/edit" };
const keyOf = (item) => `${item.kind}:${item.id}`;
const dateTime = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(undefined,
  { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function MyIndicatorsTable({ onStats, draftsOnly = false, onDraftsOnlyChange }) {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState({ page: 0, size: 10, search: "", indicatorType: "", sortBy: "updatedAt", sortDirection: "desc" });
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
  const status = (item) => <Chip size="small" variant="outlined" color={item.kind === "DRAFT" ? "warning" : "success"}
    label={item.kind === "DRAFT" ? "Draft" : "Saved"} sx={item.kind === "DRAFT" ? (theme) => ({
      color: theme.palette.text.primary, bgcolor: alpha(theme.palette.warning.main, 0.12), fontWeight: 600,
    }) : undefined} />;
  const filtered = Boolean(search || query.indicatorType);

  return <Stack sx={{ gap: 2, minWidth: 0 }}>
    <Paper variant="outlined" sx={{ p: 2 }}><Stack sx={{ gap: 2 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/indicator/editor")}>Create new</Button>
        <Button variant="outlined" onClick={() => setRefresh((value) => value + 1)}>Refresh</Button>
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(180px, 1fr) 200px auto" }, gap: 2, alignItems: "center" }}>
        <TextField fullWidth size="small" label="Search indicators" placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        <TextField select size="small" label="Indicator type" value={query.indicatorType}
          onChange={(event) => setQuery((previous) => ({ ...previous, page: 0, indicatorType: event.target.value }))}>
          <MenuItem value="">All types</MenuItem>{Object.entries(TYPES).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </TextField>
        <FormControlLabel sx={{ m: 0 }} label="Drafts only" control={<Checkbox checked={draftsOnly} onChange={(event) => {
          setQuery((previous) => ({ ...previous, page: 0 })); onDraftsOnlyChange(event.target.checked);
        }} />} />
      </Box>
      <Stack direction="row" sx={{ display: { xs: "flex", md: "none" }, gap: 1, alignItems: "center" }}>
        <TextField select fullWidth size="small" label="Sort by" value={query.sortBy}
          onChange={(event) => setQuery((previous) => ({ ...previous, page: 0, sortBy: event.target.value, sortDirection: "asc" }))}>
          {Object.entries(SORT_FIELDS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </TextField>
        <Tooltip title={query.sortDirection === "asc" ? "Sort descending" : "Sort ascending"}>
          <IconButton color="primary" aria-label={query.sortDirection === "asc" ? "Sort descending" : "Sort ascending"}
            onClick={() => setQuery((previous) => ({ ...previous, page: 0, sortDirection: previous.sortDirection === "asc" ? "desc" : "asc" }))}>
            {query.sortDirection === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
          </IconButton>
        </Tooltip>
      </Stack>
      <Typography variant="body2" color="text.secondary">Drafts are private unfinished work. Editing drafts leave the saved indicator and its embeds unchanged until you save the completed indicator.</Typography>
    </Stack></Paper>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRefresh((value) => value + 1)}>Retry</Button>}>{error}</Alert>}
    <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
      {loading && <LinearProgress aria-label="Loading indicators" />}
      <TableContainer sx={{ overflowX: "hidden" }}>
        <Table aria-label="Indicators" aria-busy={loading} sx={{ tableLayout: "fixed", width: "100%", "& td, & th": { overflowWrap: "anywhere" } }}>
          <TableHead><TableRow>
            <TableCell sortDirection={query.sortBy === "name" ? query.sortDirection : false}>{header("name", "Indicator")}</TableCell>
            <TableCell sx={{ width: 110, display: { xs: "none", sm: "table-cell" } }} sortDirection={query.sortBy === "status" ? query.sortDirection : false}>{header("status", "Status")}</TableCell>
            <TableCell sx={{ width: "18%", display: { xs: "none", md: "table-cell" } }} sortDirection={query.sortBy === "indicatorType" ? query.sortDirection : false}>{header("indicatorType", "Type")}</TableCell>
            <TableCell sx={{ width: "22%", display: { xs: "none", sm: "table-cell" } }} sortDirection={query.sortBy === "updatedAt" ? query.sortDirection : false}>{header("updatedAt", "Last updated")}</TableCell>
            <TableCell align="right" sx={{ width: { xs: 120, sm: 155 }, px: { xs: 1, sm: 2 } }}>Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>{!error && rows.map((item) => <TableRow key={keyOf(item)} hover>
            <TableCell><Stack sx={{ gap: 0.75 }}>
              <Typography sx={{ fontWeight: 600 }}>{item.name}</Typography>
              <Box sx={{ display: { sm: "none" } }}>{status(item)}</Box>
              {item.kind === "DRAFT" && item.sourceIndicatorId && <Typography variant="caption" color="text.secondary">Editing saved indicator</Typography>}
              {item.recoverable === false && <Typography variant="caption" color="text.secondary">Older draft needs review</Typography>}
              {item.completionPending && <Typography variant="caption" color="text.secondary">Continue to confirm the previous save</Typography>}
              <Typography variant="caption" sx={{ display: { md: "none" } }}>{TYPES[item.indicatorType] || item.indicatorType}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { sm: "none" } }}>{dateTime(item.updatedAt)}</Typography>
            </Stack></TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{status(item)}</TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{TYPES[item.indicatorType] || item.indicatorType}</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{dateTime(item.updatedAt)}</TableCell>
            <TableCell align="right" sx={{ px: { xs: 1, sm: 2 } }}><Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: "flex-end", justifyContent: "flex-end", gap: 0.5 }}>
              <Button sx={{ whiteSpace: "nowrap", minWidth: "auto", px: 0.5 }} disabled={loading || Boolean(busyKey) || item.recoverable === false}
                startIcon={item.kind === "SAVED" ? <VisibilityIcon fontSize="small" /> : undefined} aria-label={`${item.kind === "SAVED" ? "Preview" : "Continue"} ${item.name}`}
                onClick={() => navigate(item.kind === "DRAFT" ? `/indicator/editor/drafts/${encodeURIComponent(item.id)}` : `/indicator/${encodeURIComponent(item.id)}`)}>
                {item.kind === "DRAFT" ? "Continue" : "Preview"}
              </Button>
              <Tooltip title={`Actions for ${item.name}`}><IconButton disabled={loading || Boolean(busyKey)} aria-haspopup="menu"
                aria-label={`${item.kind === "DRAFT" ? "Actions" : "More actions"} for ${item.name}`} onClick={(event) => setMenu({ item, anchor: event.currentTarget })}><MoreVertIcon /></IconButton></Tooltip>
            </Stack></TableCell>
          </TableRow>)}{!loading && !rows.length && !error && <TableRow><TableCell colSpan={5}><Box sx={{ p: 4, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 600 }}>{filtered ? "No matching indicators" : draftsOnly ? "No drafts yet" : "No indicators yet"}</Typography>
            <Typography variant="body2" color="text.secondary">{filtered ? "Try another name or indicator type." : "Start an indicator and your unfinished work will appear here after its first save."}</Typography>
            <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate("/indicator/editor")}>Create an indicator</Button>
          </Box></TableCell></TableRow>}</TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={total} page={query.page} rowsPerPage={query.size} rowsPerPageOptions={[10, 25, 50]}
        sx={{ "& .MuiTablePagination-toolbar": { flexWrap: "wrap", justifyContent: "flex-end", px: 1 }, "& .MuiTablePagination-spacer": { display: "none" } }}
        onPageChange={(_event, page) => setQuery((previous) => ({ ...previous, page }))}
        onRowsPerPageChange={(event) => setQuery((previous) => ({ ...previous, page: 0, size: Number(event.target.value) }))} />
    </Paper>
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
  </Stack>;
}
MyIndicatorsTable.propTypes = { onStats: PropTypes.func, draftsOnly: PropTypes.bool, onDraftsOnlyChange: PropTypes.func.isRequired };
