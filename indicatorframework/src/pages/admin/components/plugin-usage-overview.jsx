import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Alert, Box, Button, Chip, Grid, LinearProgress, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Tabs, TextField, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import SectionCard from "../../../common/components/section-card/section-card";
import { requestAdminAnalyticsMethods, requestAdminUsage, requestAdminVisualizationLibraries, requestAdminVisualizationTypes } from "../utils/manage-apis";
import { filterPluginUsage, PLUGIN_CATEGORIES, pluginUsageModel } from "../utils/plugin-usage-model.js";
import PluginCatalogActions from "./plugin-catalog-actions";

const loaders = [requestAdminAnalyticsMethods, requestAdminVisualizationLibraries, requestAdminVisualizationTypes, requestAdminUsage];
const PluginUsageOverview = ({ refreshKey }) => {
  const { api } = useContext(AuthContext);
  const generation = useRef(0);
  const [data, setData] = useState({ catalogs: {}, usage: null, errors: [] });
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("analyticsMethods");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("indicatorCount");
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(5);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    const results = await Promise.allSettled(loaders.map((loader) => loader(api)));
    if (request !== generation.current) return;
    const catalogs = {}; const errors = [];
    PLUGIN_CATEGORIES.forEach((item, index) => {
      const result = results[index];
      catalogs[item.key] = result.status === "fulfilled" && Array.isArray(result.value.data) ? result.value.data : null;
      if (!catalogs[item.key]) errors.push(item.label);
    });
    const payload = results[3].status === "fulfilled" ? results[3].value.data : null;
    const usage = payload && PLUGIN_CATEGORIES.every((item) => Array.isArray(payload[item.key])) ? payload : null;
    if (!usage) errors.push("Saved-indicator usage");
    setData({ catalogs, usage, errors }); setLoading(false);
  }, [api]);
  useEffect(() => { const counter = generation; load(); return () => { counter.current++; }; }, [load, refreshKey]);
  const model = useMemo(() => pluginUsageModel(data.catalogs, data.usage), [data]);
  const filtered = useMemo(() => filterPluginUsage(model.rows, { category, search, filter, sort, direction }), [model, category, search, filter, sort, direction]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / size) - 1));
  const selected = PLUGIN_CATEGORIES.find((item) => item.key === category);
  const toggleSort = (field) => { setDirection(sort === field && direction === "desc" ? "asc" : "desc"); setSort(field); setPage(0); };
  const changeFilter = (value) => { setFilter(value); setPage(0); };

  return <Stack sx={{ gap: 2 }}>
    <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1 }}>
      <Box><Typography variant="h5" component="h2">Plugin usage</Typography>
        <Typography variant="body2" color="text.secondary">Catalog entries include each installed version. Usage counts saved-indicator references and distinct creators.</Typography></Box>
      <Button disabled={loading} onClick={load}>Refresh plugin usage</Button>
    </Stack>
    {loading && <LinearProgress aria-label="Loading plugin usage" />}
    {!loading && data.errors.length > 0 && <Alert severity="warning" action={<Button color="inherit" onClick={load}>Retry</Button>}>Could not load: {data.errors.join(", ")}. Unavailable counts are shown as a dash.</Alert>}
    <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
      <Chip variant="outlined" label={`${data.usage?.savedIndicatorCount ?? "—"} saved indicators`} />
      <Chip variant="outlined" label={`${data.usage?.uniqueCreatorCount ?? "—"} distinct indicator creators`} />
    </Stack>
    <Grid container spacing={2}>
      {PLUGIN_CATEGORIES.map((item) => {
        const summary = model.summaries[item.key];
        return <Grid size={{ xs: 12, md: 4 }} key={item.key} sx={{ display: "flex" }}>
          <SectionCard title={item.label} helper="Installed catalog entries, including retained versions">
            <Stack sx={{ gap: 1.5 }}>
              <Typography variant="h3" component="p">{summary?.installed ?? "—"}<Typography component="span" variant="body2" color="text.secondary"> installed</Typography></Typography>
              <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Chip size="small" variant="outlined" label={`${summary?.enabled ?? "—"} enabled`} />
                <Chip size="small" variant="outlined" label={`${summary?.disabled ?? "—"} disabled`} />
              </Stack>
              <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Button size="small" disabled={!summary || !data.usage} onClick={() => { setCategory(item.key); changeFilter("inUse"); }}>{summary?.inUse ?? "—"} in use</Button>
                <Button size="small" disabled={!summary || !data.usage} onClick={() => { setCategory(item.key); changeFilter("unused"); }}>{summary?.unused ?? "—"} without saved references</Button>
              </Stack>
              <Box><Button component={RouterLink} to={item.to} size="small">Open catalog</Button></Box>
            </Stack>
          </SectionCard>
        </Grid>;
      })}
    </Grid>
    {model.unresolvedReferences > 0 && <Alert severity="warning">Saved references outside the loaded catalogs: {model.unresolvedReferences}. These are reference counts across plugin kinds, rather than distinct indicators.</Alert>}
    <SectionCard title="Usage by entry" helper="Most used entries appear first. Zero saved references does not establish that an entry can be removed: drafts, cards and pending operations are checked during removal.">
      <Stack sx={{ gap: 2 }}>
        <Tabs value={category} onChange={(_, value) => { setCategory(value); setPage(0); }} variant="scrollable" scrollButtons="auto" aria-label="Plugin usage category">
          {PLUGIN_CATEGORIES.map((item) => <Tab key={item.key} value={item.key} label={item.label} />)}
        </Tabs>
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2 }}>
          <TextField size="small" label="Search plugin entries" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} sx={{ flex: 1 }} />
          <TextField select size="small" label="Show entries" value={filter} onChange={(event) => changeFilter(event.target.value)} sx={{ minWidth: 240 }}>
            <MenuItem value="all">All entries</MenuItem><MenuItem value="inUse" disabled={!data.usage}>With saved references</MenuItem>
            <MenuItem value="unused" disabled={!data.usage}>Without saved references</MenuItem><MenuItem value="disabled">Disabled entries</MenuItem>
          </TextField>
        </Stack>
        <TableContainer><Table size="small" aria-label={`${selected.label} usage`} sx={{ minWidth: 680 }}>
          <TableHead><TableRow>
            {[['name', 'Entry'], ['indicatorCount', 'Saved indicators'], ['creatorCount', 'Creators']].map(([key, label]) => <TableCell key={key} sortDirection={sort === key ? direction : false}>
              <TableSortLabel active={sort === key} direction={sort === key ? direction : "desc"} onClick={() => toggleSort(key)} disabled={key !== "name" && !data.usage}
                sx={{ "& .MuiTableSortLabel-icon": { opacity: sort === key ? 1 : 0.45 } }}>{label}</TableSortLabel>
            </TableCell>)}
            <TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>{filtered.slice(currentPage * size, (currentPage + 1) * size).map((row) => <TableRow key={row.id}>
            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.name}</Typography>
              <Typography variant="caption" color="text.secondary">{row.library ? `${row.library} · ` : ""}{row.artifactId ? `Version ${row.artifactId.slice(-64, -56)}` : "Existing version"}</Typography></TableCell>
            <TableCell>{row.indicatorCount ?? "—"}</TableCell><TableCell>{row.creatorCount ?? "—"}</TableCell>
            <TableCell><Chip size="small" label={row.enabled ? "Enabled" : "Disabled"} variant="outlined" color={row.enabled ? "success" : "default"} />
              {row.kind === "VISUALIZATION_TYPE" && row.enabled && row.selectable !== true && <Typography variant="caption" sx={{ display: "block" }} color="text.secondary">{row.selectable === false ? "Library disabled" : "Library status unavailable"}</Typography>}</TableCell>
            <TableCell align="right"><PluginCatalogActions kind={row.kind} entry={row} onSaved={load} /></TableCell>
          </TableRow>)}
          {!filtered.length && <TableRow><TableCell colSpan={5}>{loading ? "Loading entries…" : !model.summaries[category] ? "Catalog unavailable. Retry to load entries." : !data.usage && ["unused", "inUse"].includes(filter) ? "Usage unavailable. Retry or choose All entries." : "No entries match these filters."}</TableCell></TableRow>}
          </TableBody>
        </Table></TableContainer>
        <TablePagination component="div" count={filtered.length} page={currentPage} rowsPerPage={size} rowsPerPageOptions={[5, 10, 25]} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={(event) => { setSize(Number(event.target.value)); setPage(0); }} />
        <Typography variant="caption" color="text.secondary">These are saved-work counts, rather than execution or activity statistics. A chart also needs its library enabled for new selections. <Button component={RouterLink} to={selected.to} size="small">Manage {selected.label.toLowerCase()}</Button></Typography>
      </Stack>
    </SectionCard>
  </Stack>;
};
PluginUsageOverview.propTypes = { refreshKey: PropTypes.number.isRequired };
export default PluginUsageOverview;
