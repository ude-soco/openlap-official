import PropTypes from "prop-types";
import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { canSelectSource } from "./complex-model";

const savedDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

export default function SourceCatalogTable({
  sources,
  loading,
  type,
  selectedSources,
  addSource,
  requestRemove,
  previewIndicator,
  sortBy,
  sortDirection,
  onSort,
  emptyMessage,
}) {
  const sortLabel = (field, label, ariaLabel) => (
    <TableSortLabel
      active={sortBy === field}
      direction={sortBy === field ? sortDirection : "asc"}
      onClick={() => onSort(field)}
      aria-label={ariaLabel}
      disabled={loading}
      sx={{ "& .MuiTableSortLabel-icon": { opacity: sortBy === field ? 1 : 0.45 } }}
    >
      {label}
    </TableSortLabel>
  );

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={(theme) => ({
        width: "100%",
        maxWidth: "100%",
        maxHeight: { xs: 480, md: 560 },
        overflow: "auto",
        borderRadius: `${theme.custom.radii.card}px`,
      })}
    >
      <Table
        stickyHeader
        size="small"
        aria-label="Available Basic indicators"
        aria-busy={loading}
        sx={{ tableLayout: "fixed", minWidth: 0 }}
      >
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" sx={{ width: 48 }}>
              <Box component="span" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
                Selection
              </Box>
            </TableCell>
            <TableCell sortDirection={sortBy === "name" ? sortDirection : false} sx={{ fontWeight: 600 }}>
              <Stack direction="row" sx={{ alignItems: "center", gap: 1, justifyContent: "space-between", flexWrap: "wrap" }}>
                {sortLabel("name", "Indicator", "Sort by indicator name")}
                <Box sx={{ display: { xs: "inline-flex", md: "none" } }}>
                  {sortLabel("createdOn", "Last saved", "Sort by date")}
                </Box>
              </Stack>
            </TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" }, width: "30%", fontWeight: 600 }}>
              Analytics method
            </TableCell>
            <TableCell sortDirection={sortBy === "createdOn" ? sortDirection : false}
              sx={{ display: { xs: "none", md: "table-cell" }, width: 128, fontWeight: 600 }}>
              {sortLabel("createdOn", "Last saved", "Sort by date")}
            </TableCell>
            <TableCell align="center" sx={{ width: { xs: 56, sm: 80 }, px: 0.5, fontWeight: 600 }}>
              Preview
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={5} sx={{ py: 4, textAlign: "center" }}>Loading your Basic indicators…</TableCell></TableRow>
          ) : sources.length ? sources.map((source) => {
            const selectedSource = selectedSources.find((entry) => entry.id === source.id);
            const selected = Boolean(selectedSource);
            const selection = canSelectSource(type, selectedSources, source);
            const reason = !selection.allowed && selection.reason !== "Already selected" ? selection.reason : "";
            const reasonId = `complex-source-${source.id}-reason`;
            const disabled = !selected && !selection.allowed;
            return (
              <TableRow key={source.id} selected={selected} aria-selected={selected} hover>
                <TableCell padding="checkbox" sx={{ verticalAlign: "top", pt: 1 }}>
                  <Checkbox
                    checked={selected}
                    disabled={disabled}
                    onChange={() => selected ? requestRemove(selectedSource) : addSource(source)}
                    slotProps={{ input: {
                      "aria-label": `${selected ? "Deselect" : "Select"} ${source.name}`,
                      "aria-describedby": reason ? reasonId : undefined,
                    } }}
                  />
                </TableCell>
                <TableCell component="th" scope="row" sx={{ py: 1.5, overflowWrap: "anywhere", verticalAlign: "top" }}>
                  <Stack sx={{ gap: 0.5, alignItems: "flex-start", minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{source.name}</Typography>
                    <Box sx={{ height: 24, display: "inline-flex", alignItems: "center" }}>
                      {selected
                        ? <Chip size="small" color="primary" variant="outlined" icon={<CheckIcon />} label="Selected" sx={{ height: 24 }} />
                        : <Typography variant="caption" color="text.secondary">Not selected</Typography>}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", md: "none" } }}>
                      {source.analyticsMethod?.name || "Method unavailable"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", md: "none" } }}>
                      Last saved {savedDate(source.createdOn)}
                    </Typography>
                    {reason && <Typography id={reasonId} variant="caption" color={source.available === false ? "error" : "text.secondary"}>{reason}</Typography>}
                  </Stack>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" }, verticalAlign: "top", py: 1.5, overflowWrap: "anywhere" }}>
                  <Typography variant="body2" color="text.secondary">{source.analyticsMethod?.name || "Method unavailable"}</Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" }, verticalAlign: "top", py: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">{savedDate(source.createdOn)}</Typography>
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: "top", px: 0.5, py: 1 }}>
                  <Tooltip title="Preview indicator">
                    <IconButton color="primary" aria-label={`Preview ${source.name}`}
                      aria-describedby={reason ? reasonId : undefined}
                      data-source-preview-id={source.id}
                      onClick={() => previewIndicator(source)}>
                      <VisibilityOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          }) : (
            <TableRow><TableCell colSpan={5} sx={{ py: 4, textAlign: "center" }}>{emptyMessage}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

SourceCatalogTable.propTypes = {
  sources: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  type: PropTypes.string.isRequired,
  selectedSources: PropTypes.array.isRequired,
  addSource: PropTypes.func.isRequired,
  requestRemove: PropTypes.func.isRequired,
  previewIndicator: PropTypes.func.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortDirection: PropTypes.oneOf(["asc", "desc"]).isRequired,
  onSort: PropTypes.func.isRequired,
  emptyMessage: PropTypes.string,
};
