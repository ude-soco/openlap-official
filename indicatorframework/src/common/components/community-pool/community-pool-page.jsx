import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Alert, Box, Button, Chip, IconButton, InputAdornment, MenuItem, Paper, Stack,
  TableCell, TableRow, TableSortLabel, TextField, Tooltip, Typography } from "@mui/material";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import PageHeader from "../page-header/page-header.jsx";
import { WorkspaceDashboard, WorkspaceTable } from "../workspace-dashboard/workspace-dashboard.jsx";
import { MEDIUM, WIDE, dateColumn, detailColumn, actionColumn, dashboardDateTime }
  from "../workspace-dashboard/workspace-dashboard-styles.js";
import { communityError, communityTypeName, requestCommunityFilters, requestCommunityPool, searchCommunityIndicators } from "./community-pool-api.js";
import CommunityPoolDetail from "./community-pool-detail.jsx";
import IndicatorPoolSearch from "./indicator-pool-search.jsx";

const SORT_FIELDS = { name: "Name", updatedAt: "Last updated" };
const EMPTY_FILTERS = { types: [], methods: [], charts: [], goals: [] };

export default function CommunityPoolPage({ kind }) {
  const { api } = useContext(AuthContext);
  const isc = kind === "isc", title = isc ? "ISC Pool" : "Indicator Pool";
  const [query, setQuery] = useState({ page: 0, size: 10, search: "", criteria: null, sortBy: "updatedAt", sortDirection: "desc", type: "", method: "", chart: "", goal: "" });
  const [search, setSearch] = useState("");
  const [searchFormKey, setSearchFormKey] = useState(0);
  const [nameFallback, setNameFallback] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!isc) return;
    const timer = setTimeout(() => setQuery((previous) => previous.search === search ? previous : { ...previous, page: 0, search }), 300);
    return () => clearTimeout(timer);
  }, [isc, search]);
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    requestCommunityFilters(api, kind, controller.signal).then((result) => { if (current) setFilters({ ...EMPTY_FILTERS, ...result }); })
      .catch(() => { /* The list remains usable if filter suggestions are temporarily unavailable. */ });
    return () => { current = false; controller.abort(); };
  }, [api, kind, reload]);
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    setLoading(true); setError(""); setNameFallback(false);
    const { criteria, ...options } = query;
    const request = kind === "indicators" && criteria
      ? searchCommunityIndicators(api, criteria, options, controller.signal)
      : requestCommunityPool(api, kind, options, controller.signal);
    request.then((result) => {
      if (!current) return;
      setRows(result.content || []); setTotal(result.totalElements || 0);
      setNameFallback(result.searchMode === "name");
      if (!(result.content || []).length && query.page > 0) setQuery((previous) => ({ ...previous,
        page: Math.max(0, Math.ceil((result.totalElements || 0) / previous.size) - 1) }));
    }).catch((failure) => { if (current) setError(communityError(failure, "Could not load the community pool. Please try again.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [api, kind, query, reload]);

  const update = (patch) => setQuery((previous) => ({ ...previous, page: 0, ...patch }));
  const applySearch = (criteria) => update({ criteria, sortBy: criteria ? "relevance" : "updatedAt", sortDirection: "desc" });
  const sort = (sortBy) => setQuery((previous) => ({ ...previous, page: 0, sortBy,
    sortDirection: previous.sortBy === sortBy && previous.sortDirection === "asc" ? "desc" : "asc" }));
  const header = (field, label) => <TableSortLabel active={query.sortBy === field}
    direction={query.sortBy === field ? query.sortDirection : "asc"} onClick={() => sort(field)}>{label}</TableSortLabel>;
  const filter = (field, label, values) => <TextField select size="small" label={label} value={query[field]}
    sx={{ flex: "1 1 155px", minWidth: 130, maxWidth: { xs: "none", sm: 235 } }} onChange={(event) => update({ [field]: event.target.value })}>
    <MenuItem value="">All {label.toLowerCase()}s</MenuItem>
    {[...new Set([...(values || []), query[field]].filter(Boolean))].map((value) =>
      <MenuItem key={value} value={value}>{field === "type" ? communityTypeName(value) : value}</MenuItem>)}
  </TextField>;
  const filtered = Boolean(query.criteria || query.search || query.type || query.method || query.chart || query.goal);
  const clearFilters = () => {
    setSearch("");
    setSearchFormKey((previous) => previous + 1);
    update({ search: "", criteria: null, type: "", method: "", chart: "", goal: "",
      ...(query.sortBy === "relevance" ? { sortBy: "updatedAt", sortDirection: "desc" } : {}) });
  };
  const saved = (id, copiedId) => setRows((previous) => previous.map((row) => row.id === id ? { ...row, copiedId } : row));

  return <Stack sx={{ gap: 2, minWidth: 0 }}>
    <PageHeader title={title} breadcrumbs={[{ label: "Home", to: "/" }]}
      subtitle={isc ? "Explore community specifications and save a copy to make it your own." : "Explore community indicators and preview them with your own learning data."}
      actions={<Chip icon={<HubOutlinedIcon />} variant="outlined" label={`${total} ${isc ? "ISC" : "indicator"}${total === 1 ? "" : "s"}`} />} />
    <WorkspaceDashboard>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box component="section" aria-label={`${title} controls`} sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          {isc ? <TextField size="small" label="Search ISCs" placeholder="Search by name" value={search}
            sx={{ flex: "2 1 240px", minWidth: 160 }} onChange={(event) => setSearch(event.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
            : <IndicatorPoolSearch key={searchFormKey} applied={Boolean(query.criteria)} onSearch={applySearch} />}
          {!isc && filter("type", "Indicator type", filters.types)}
          {!isc && filter("method", "Analytics method", filters.methods)}
          {isc && filter("goal", "Goal", filters.goals)}
          {filter("chart", "Chart", filters.charts)}
        </Box>
        {nameFallback && <Alert severity="info" sx={{ mt: 2 }}>
          Semantic search is unavailable. Showing matches by indicator name.
        </Alert>}
        <Stack direction="row" sx={{ display: "flex", [WIDE]: { display: "none" }, gap: 1, alignItems: "center", mt: 2 }}>
          <TextField select size="small" fullWidth label="Sort by" value={query.sortBy} onChange={(event) => update({ sortBy: event.target.value,
            ...(event.target.value === "relevance" ? { sortDirection: "desc" } : {}) })}>
            {query.criteria && <MenuItem value="relevance">Relevance</MenuItem>}
            {Object.entries(SORT_FIELDS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
          {query.sortBy !== "relevance" && <Tooltip title={query.sortDirection === "asc" ? "Sort descending" : "Sort ascending"}>
            <IconButton color="primary" aria-label={query.sortDirection === "asc" ? "Sort descending" : "Sort ascending"}
              onClick={() => update({ sortDirection: query.sortDirection === "asc" ? "desc" : "asc" })}>
              {query.sortDirection === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
            </IconButton>
          </Tooltip>}
        </Stack>
      </Paper>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setReload((previous) => previous + 1)}>Retry</Button>}>{error}</Alert>}
      <WorkspaceTable label={title} loading={loading} total={total} page={query.page} size={query.size}
        onPageChange={(page) => setQuery((previous) => ({ ...previous, page }))} onSizeChange={(size) => update({ size })}
        emptyState={!loading && !error && !rows.length && <Box sx={{ p: 4, textAlign: "center" }}>
          <HubOutlinedIcon color="disabled" sx={{ fontSize: 40, mb: 1 }} />
          <Typography sx={{ fontWeight: 600 }}>{filtered ? "No matching community indicators" : "No community indicators yet"}</Typography>
          <Typography variant="body2" color="text.secondary">{filtered ? "Try another search or adjust the filters." : "Completed indicators will appear here."}</Typography>
          {filtered && <Button sx={{ mt: 1 }} onClick={clearFilters}>Clear filters</Button>}
        </Box>}
        header={<TableRow>
          <TableCell sortDirection={query.sortBy === "name" ? query.sortDirection : false}>{header("name", isc ? "ISC" : "Indicator")}</TableCell>
          <TableCell sx={detailColumn}>{isc ? "Goal" : "Analytics method"}</TableCell>
          <TableCell sx={{ ...detailColumn, width: "15%" }}>Chart</TableCell>
          <TableCell sx={dateColumn} sortDirection={query.sortBy === "updatedAt" ? query.sortDirection : false}>{header("updatedAt", "Last updated")}</TableCell>
          <TableCell sx={actionColumn} align="right">Details</TableCell>
        </TableRow>}>
        {!error && rows.map((row) => <TableRow hover key={row.id}>
          <TableCell><Stack sx={{ gap: 0.75 }}>
            <Typography sx={{ fontWeight: 600 }}>{row.name || "Community indicator"}</Typography>
            <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              {!isc && <Typography variant="caption" color="text.secondary">{communityTypeName(row.type)}</Typography>}
              {row.copiedId && <Chip size="small" color="success" variant="outlined" icon={<CheckCircleOutlineIcon />} label="Saved to dashboard" />}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", [WIDE]: { display: "none" } }}>{[isc ? row.goal : row.method, row.chart].filter(Boolean).join(" · ") || "—"}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", [MEDIUM]: { display: "none" } }}>{dashboardDateTime(row.updatedAt)}</Typography>
          </Stack></TableCell>
          <TableCell sx={detailColumn}>{(isc ? row.goal : row.method) || "—"}</TableCell>
          <TableCell sx={{ ...detailColumn, width: "15%" }}>{row.chart || "—"}</TableCell>
          <TableCell sx={dateColumn}>{dashboardDateTime(row.updatedAt)}</TableCell>
          <TableCell sx={actionColumn} align="right"><Button disabled={loading} startIcon={<VisibilityOutlinedIcon />}
            sx={{ minWidth: 0, whiteSpace: "nowrap", px: 0.5 }} aria-label={`View ${row.name || "community indicator"}`}
            onClick={() => setSelected(row)}>View</Button></TableCell>
        </TableRow>)}
      </WorkspaceTable>
    </WorkspaceDashboard>
    {selected && <CommunityPoolDetail key={`${kind}:${selected.id}`} kind={kind} row={selected}
      onClose={() => setSelected(null)} onSaved={(copiedId) => saved(selected.id, copiedId)} />}
  </Stack>;
}
CommunityPoolPage.propTypes = { kind: PropTypes.oneOf(["indicators", "isc"]).isRequired };
