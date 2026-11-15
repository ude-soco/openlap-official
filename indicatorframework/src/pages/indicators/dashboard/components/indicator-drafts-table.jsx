import { useCallback, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  InputAdornment, LinearProgress, Menu, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, TextField, Tooltip, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { createIndicatorDraftApi, draftErrorMessage } from "../../indicator-editor/drafts/indicator-draft-api.js";

const TYPE_LABELS = { BASIC: "Basic", COMPOSITE: "Composite", MULTI_LEVEL: "Multilevel analysis" };
const dateTime = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(undefined,
  { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function IndicatorDraftsTable({ onStats }) {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
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
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery((previous) => previous.search === search ? previous : { ...previous, page: 0, search }), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    createIndicatorDraftApi(api).list(query).then((result) => {
      if (!active) return;
      setRows(result.content || []); setTotal(result.totalElements || 0);
      onStats?.({ total: result.totalElements || 0 });
      if (!(result.content || []).length && query.page > 0) setQuery((previous) => ({ ...previous, page: previous.page - 1 }));
    }).catch((failure) => { if (active) setError(draftErrorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, query, refresh, onStats]);
  const sort = (sortBy) => setQuery((previous) => ({ ...previous, page: 0, sortBy,
    sortDirection: previous.sortBy === sortBy && previous.sortDirection === "asc" ? "desc" : "asc" }));
  const beginAction = (kind, item) => {
    setMenu(null); setActionError(""); setName(item.name || ""); setAction({ kind, item });
  };
  const finishAction = useCallback(async () => {
    setBusy(true); setActionError("");
    try {
      const transport = createIndicatorDraftApi(api);
      if (action.kind === "discard") await transport.discard(action.item.id, action.item.revision);
      else {
        const current = await transport.get(action.item.id);
        if (current.revision !== action.item.revision) throw new Error("This draft changed since the list was loaded. Close this dialog and refresh the list before renaming it.");
        await transport.update(current.id, { revision: current.revision, clientRequestId: crypto.randomUUID(),
          name: name.trim(), configuration: current.configuration, schemaVersion: current.schemaVersion });
      }
      setAction(null); setRefresh((value) => value + 1);
    } catch (failure) { setActionError(draftErrorMessage(failure)); }
    finally { setBusy(false); }
  }, [api, action, name]);
  const header = (field, label) => <TableSortLabel active={query.sortBy === field} direction={query.sortBy === field ? query.sortDirection : "asc"}
    onClick={() => sort(field)}>{label}</TableSortLabel>;
  return <Stack sx={{ gap: 2, minWidth: 0 }}>
    <Typography variant="body2" color="text.secondary">Drafts are private unfinished work. Editing drafts leave the saved indicator and its embeds unchanged.</Typography>
    <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2 }}>
      <TextField fullWidth label="Search drafts" placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }} />
      <TextField select label="Indicator type" value={query.indicatorType} sx={{ minWidth: { sm: 200 } }}
        onChange={(event) => setQuery((previous) => ({ ...previous, page: 0, indicatorType: event.target.value }))}>
        <MenuItem value="">All types</MenuItem>{Object.entries(TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
      </TextField>
      <Button variant="outlined" onClick={() => setRefresh((value) => value + 1)}>Refresh</Button>
    </Stack>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRefresh((value) => value + 1)}>Retry</Button>}>{error}</Alert>}
    <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
      {loading && <LinearProgress aria-label="Loading drafts" />}
      <TableContainer sx={{ overflowX: "hidden" }}>
        <Table aria-label="Indicator drafts" sx={{ tableLayout: "fixed", width: "100%", "& td, & th": { overflowWrap: "anywhere" } }}>
          <TableHead><TableRow>
            <TableCell sortDirection={query.sortBy === "name" ? query.sortDirection : false}>{header("name", "Indicator")}</TableCell>
            <TableCell sx={{ width: "18%", display: { xs: "none", md: "table-cell" } }}>{header("indicatorType", "Type")}</TableCell>
            <TableCell sx={{ width: "23%", display: { xs: "none", sm: "table-cell" } }}>{header("updatedAt", "Last saved")}</TableCell>
            <TableCell align="right" sx={{ width: { xs: 105, sm: 155 } }}>Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>{rows.map((item) => <TableRow key={item.id} hover>
            <TableCell><Stack sx={{ gap: 0.75 }}>
              <Typography sx={{ fontWeight: 600 }}>{item.name}</Typography>
              <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}><Chip size="small" color={item.sourceIndicatorId ? "warning" : "info"}
                label={item.sourceIndicatorId ? "Editing draft" : "Draft"} />
                {item.recoverable === false && <Chip size="small" variant="outlined" label="Needs review" />}</Stack>
              <Typography variant="caption" sx={{ display: { md: "none" } }}>{TYPE_LABELS[item.indicatorType] || item.indicatorType}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { sm: "none" } }}>{dateTime(item.updatedAt)}</Typography>
            </Stack></TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{TYPE_LABELS[item.indicatorType] || item.indicatorType}</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{dateTime(item.updatedAt)}</TableCell>
            <TableCell align="right"><Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: "flex-end", justifyContent: "flex-end", gap: 0.5 }}>
              <Button disabled={item.recoverable === false} onClick={() => navigate(`/indicator/editor/drafts/${encodeURIComponent(item.id)}`)}>Continue</Button>
              <Tooltip title={`Actions for ${item.name}`}><IconButton aria-label={`Actions for ${item.name}`} onClick={(event) => setMenu({ item, anchor: event.currentTarget })}><MoreVertIcon /></IconButton></Tooltip>
            </Stack></TableCell>
          </TableRow>)}{!loading && !rows.length && !error && <TableRow><TableCell colSpan={4}><Box sx={{ p: 4, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 600 }}>{query.search || query.indicatorType ? "No matching drafts" : "No drafts yet"}</Typography>
            <Typography variant="body2" color="text.secondary">{query.search || query.indicatorType ? "Try another name or indicator type." : "Start an indicator and your work will appear here after its first save."}</Typography>
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
      <MenuItem disabled={menu?.item.recoverable === false} onClick={() => beginAction("rename", menu.item)}>Rename draft</MenuItem>
      <MenuItem onClick={() => beginAction("discard", menu.item)} sx={{ color: "error.main" }}>Discard draft</MenuItem>
    </Menu>
    <Dialog open={Boolean(action)} onClose={busy ? undefined : () => setAction(null)} fullWidth maxWidth="sm" aria-labelledby="draft-list-action-title">
      <DialogTitle id="draft-list-action-title">{action?.kind === "discard" ? "Discard this draft?" : "Rename draft"}</DialogTitle>
      <DialogContent><Stack sx={{ gap: 2, pt: 1 }}>{action?.kind === "discard"
        ? <Typography>This removes “{action.item.name}” from your unfinished work. Any previously saved indicator and its embeds stay unchanged.</Typography>
        : <TextField autoFocus fullWidth label="Draft name" value={name} disabled={busy} onChange={(event) => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />}
        {actionError && <Alert severity="error">{actionError}</Alert>}</Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setAction(null)}>Cancel</Button>
        <Button variant="contained" color={action?.kind === "discard" ? "error" : "primary"} disabled={busy || (action?.kind === "rename" && !name.trim())}
          onClick={finishAction}>{busy ? "Saving…" : action?.kind === "discard" ? "Discard draft" : "Save name"}</Button></DialogActions>
    </Dialog>
  </Stack>;
}
IndicatorDraftsTable.propTypes = { onStats: PropTypes.func };
