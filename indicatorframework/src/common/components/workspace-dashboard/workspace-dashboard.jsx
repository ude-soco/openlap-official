import PropTypes from "prop-types";
import {
  Box, Button, Chip, IconButton, LinearProgress, MenuItem, Paper, Stack, Table,
  TableBody, TableContainer, TableHead, TablePagination, TextField, Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { WIDE } from "./workspace-dashboard-styles.js";

/** Shared presentation only; each workspace keeps its own query and lifecycle. */
export function WorkspaceDashboard({ children }) {
  return <Stack sx={{ gap: 2, minWidth: 0, containerType: "inline-size", containerName: "workspace-dashboard" }}>{children}</Stack>;
}
WorkspaceDashboard.propTypes = { children: PropTypes.node };

export function WorkspaceToolbar({ label = "Workspace controls", onCreate, createLabel = "Create new",
  children, sortFields, sortBy, sortDirection, onSortField, onSortDirection }) {
  const directionLabel = sortDirection === "asc" ? "Sort descending" : "Sort ascending";
  return <Paper variant="outlined" sx={{ p: 2 }}><Stack sx={{ gap: 2 }}>
    <Box component="section" aria-label={label} sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
      <Button variant="contained" startIcon={<AddIcon />} sx={{ flexShrink: 0, whiteSpace: "nowrap", minHeight: 40 }}
        onClick={onCreate}>{createLabel}</Button>
      {children}
    </Box>
    <Stack direction="row" sx={{ display: "flex", [WIDE]: { display: "none" }, gap: 1, alignItems: "center" }}>
      <TextField select fullWidth size="small" label="Sort by" value={sortBy}
        onChange={(event) => onSortField(event.target.value)}>
        {Object.entries(sortFields).map(([value, name]) => <MenuItem key={value} value={value}>{name}</MenuItem>)}
      </TextField>
      <Tooltip title={directionLabel}>
        <IconButton color="primary" aria-label={directionLabel}
          onClick={() => onSortDirection(sortDirection === "asc" ? "desc" : "asc")}>
          {sortDirection === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
        </IconButton>
      </Tooltip>
    </Stack>
  </Stack></Paper>;
}
WorkspaceToolbar.propTypes = {
  label: PropTypes.string, onCreate: PropTypes.func.isRequired, createLabel: PropTypes.string,
  children: PropTypes.node, sortFields: PropTypes.objectOf(PropTypes.string).isRequired,
  sortBy: PropTypes.string.isRequired, sortDirection: PropTypes.oneOf(["asc", "desc"]).isRequired,
  onSortField: PropTypes.func.isRequired, onSortDirection: PropTypes.func.isRequired,
};

export function WorkspaceTable({ label, loading, loadingLabel = `Loading ${label.toLowerCase()}`,
  header, children, total, page, size, onPageChange, onSizeChange }) {
  return <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
    {loading && <LinearProgress aria-label={loadingLabel} />}
    <TableContainer sx={{ overflowX: "hidden" }}>
      <Table aria-label={label} aria-busy={loading} sx={{ tableLayout: "fixed", width: "100%", "& td, & th": { overflowWrap: "anywhere" } }}>
        <TableHead>{header}</TableHead>
        <TableBody>{children}</TableBody>
      </Table>
    </TableContainer>
    <TablePagination component="div" count={total} page={page} rowsPerPage={size} rowsPerPageOptions={[10, 25, 50]}
      sx={{ "& .MuiTablePagination-toolbar": { flexWrap: "wrap", justifyContent: "flex-end", px: 1 }, "& .MuiTablePagination-spacer": { display: "none" } }}
      onPageChange={(_event, nextPage) => onPageChange(nextPage)}
      onRowsPerPageChange={(event) => onSizeChange(Number(event.target.value))} />
  </Paper>;
}
WorkspaceTable.propTypes = {
  label: PropTypes.string.isRequired, loading: PropTypes.bool.isRequired, loadingLabel: PropTypes.string,
  header: PropTypes.node.isRequired, children: PropTypes.node, total: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired, size: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired, onSizeChange: PropTypes.func.isRequired,
};

export function WorkspaceStatusChip({ draft }) {
  return <Chip size="small" variant="outlined" color={draft ? "warning" : "success"}
    label={draft ? "Draft" : "Saved"} sx={draft ? (theme) => ({
      color: theme.palette.text.primary, bgcolor: alpha(theme.palette.warning.main, 0.12), fontWeight: 600,
    }) : undefined} />;
}
WorkspaceStatusChip.propTypes = { draft: PropTypes.bool.isRequired };
