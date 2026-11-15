import { useState } from "react";
import PropTypes from "prop-types";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import SectionCard from "../../../../common/components/section-card/section-card";
import { canSelectSource } from "./complex-model";
import { Failure } from "./complex-controls";
import SourceCatalogTable from "./source-catalog-table";

export default function ComplexSourcesStep({
  setCatalogRetry,
  sourcesLoading,
  isMulti,
  search,
  setSearch,
  setSourcePage,
  sourceError,
  catalog,
  type,
  configuration,
  addSource,
  sourcePage,
  requestRemove,
  removedSource,
  change,
  setRemovedSource,
  setSourcesConfirmed,
  setCurrent,
  sortBy,
  sortDirection,
  onSort,
  pageSize,
  setPageSize,
  compatibleOnly,
  setCompatibleOnly,
  previewIndicator,
}) {
  const [showAllSelected, setShowAllSelected] = useState(false);
  const selected = configuration.sources;
  const firstMethod = selected[0]?.analyticsMethod;
  const filteringByMethod = !isMulti && compatibleOnly && Boolean(firstMethod?.id);
  const hasFilters = Boolean(search.trim() || filteringByMethod);
  const empty = !sourcesLoading && !sourceError && !catalog.content?.length;
  const visibleSelected = showAllSelected ? selected : selected.slice(0, 3);
  const total = catalog.totalElements ?? catalog.content?.length ?? 0;
  const methodConstraint = firstMethod?.id
    ? `Required method: ${firstMethod.name}. ${filteringByMethod ? "Turn off this filter to preview other methods." : "Other methods can be previewed but not selected."}`
    : "Select the first indicator to set the required method.";
  const clearFilters = () => {
    setSearch("");
    setCompatibleOnly(false);
    setSourcePage(0);
  };

  return (
    <>
      <SectionCard
        title="Your Basic indicators"
        action={
          <Button variant="outlined" size="medium"
            onClick={() => setCatalogRetry((value) => value + 1)} disabled={sourcesLoading}>
            Refresh sources
          </Button>
        }
        helper={isMulti
          ? "Choose two to ten saved Basic indicators with a shared matching field. Analytics methods may differ."
          : "Choose two to ten saved Basic indicators. The first selection sets the required analytics method."}
      >
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1, alignItems: { sm: "center" } }}>
          <TextField
            id="complex-source-search"
            fullWidth
            type="search"
            label="Search your Basic indicators"
            placeholder="Search by indicator name"
            value={search}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> } }}
            onChange={(event) => {
              setSearch(event.target.value);
              setSourcePage(0);
            }}
          />
          {hasFilters && <Button sx={{ flexShrink: 0 }} onClick={clearFilters}>Clear filters</Button>}
        </Stack>
        {!isMulti && (
          <Stack sx={{ gap: 0.5 }}>
            <FormControlLabel
              control={<Checkbox checked={Boolean(firstMethod?.id && compatibleOnly)} disabled={!firstMethod?.id} onChange={(event) => {
                setCompatibleOnly(event.target.checked);
                setSourcePage(0);
              }} />}
              label="Same analytics method only"
            />
            <Typography variant="body2" color="text.secondary" title={methodConstraint}
              sx={{ height: 40, lineHeight: "20px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {methodConstraint}
            </Typography>
          </Stack>
        )}
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 0.5, justifyContent: "space-between" }}>
          <Typography variant="body2" role="status" aria-live="polite" aria-atomic="true" sx={{ fontWeight: 600 }}>
            {selected.length} of 10 selected. {selected.length < 2 ? "Select at least 2 to continue." : selected.length === 10 ? "Selection limit reached. Remove one to select another." : "Ready to continue."}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {sourcesLoading ? "Loading results…" : sourceError ? "Results unavailable" : `${total} ${total === 1 ? "indicator" : "indicators"}${hasFilters ? " matching your filters" : " found"}`}
          </Typography>
        </Stack>
        <Failure message={sourceError} retry={() => setCatalogRetry((value) => value + 1)} />
        {sourcesLoading && <LinearProgress aria-label="Loading Basic indicators" />}
        <SourceCatalogTable
          sources={catalog.content || []}
          loading={sourcesLoading}
          type={type}
          selectedSources={selected}
          addSource={addSource}
          requestRemove={requestRemove}
          previewIndicator={previewIndicator}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          emptyMessage={sourceError ? "The indicator list could not be loaded. Retry to see your indicators."
            : hasFilters ? "No indicators match these filters. Clear the filters or try another name."
              : "No Basic indicators found."}
        />
        <TablePagination
          component="div"
          count={total}
          page={sourcePage}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 25, 50]}
          disabled={sourcesLoading || Boolean(sourceError)}
          onPageChange={(_, page) => setSourcePage(page)}
          onRowsPerPageChange={(event) => {
            setPageSize(Number(event.target.value));
            setSourcePage(0);
          }}
          sx={{ maxWidth: "100%", overflowX: "hidden", overscrollBehaviorX: "none", "& .MuiTablePagination-toolbar": { px: 0, flexWrap: "wrap", justifyContent: "flex-end" }, "& .MuiTablePagination-spacer": { display: "none" } }}
        />
        {empty && !hasFilters && (
          <Alert severity="info">
            Save a Basic indicator before combining results.{" "}
            <Button component={RouterLink} to="/indicator/editor/basic" size="small" target="_blank" rel="noopener">
              Create a Basic indicator
            </Button>{" "}
            Your complex-indicator selections stay in this tab.
          </Alert>
        )}
      </SectionCard>

      {selected.length > 0 && (
        <SectionCard
          title="Selected indicators"
          helper="Selections are kept across searches and pages. Removing a selection keeps the saved Basic indicator."
          action={selected.length > 3 && (
            <Button size="small" aria-expanded={showAllSelected} onClick={() => setShowAllSelected((value) => !value)}>
              {showAllSelected ? "Show fewer selected" : `Show all selected (${selected.length})`}
            </Button>
          )}
        >
          <Stack component="ul" sx={{ gap: 0.5, p: 0, m: 0, listStyle: "none" }}>
            {visibleSelected.map((source) => (
              <Stack component="li" key={source.id} direction="row" sx={{ alignItems: "center", gap: 0.5, minWidth: 0 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap title={source.name} sx={{ fontWeight: 500 }}>{source.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>{source.analyticsMethod?.name}</Typography>
                </Box>
                <Tooltip title="Preview indicator">
                  <IconButton color="primary" aria-label={`Preview ${source.name}`} data-source-preview-id={source.id} onClick={(event) => previewIndicator(source, event.currentTarget)}>
                    <VisibilityOutlinedIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove selection">
                  <IconButton color="error" aria-label={`Remove ${source.name}`} onClick={() => requestRemove(source)}><CloseIcon /></IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        </SectionCard>
      )}
      {removedSource && (
        <Alert severity="info" action={
          <Button color="inherit"
            disabled={!canSelectSource(type, selected, removedSource.source).allowed}
            onClick={() => {
              change((previous) => ({
                ...previous,
                sources: [...previous.sources.slice(0, removedSource.index), removedSource.source, ...previous.sources.slice(removedSource.index)],
              }), "sources");
              setRemovedSource(null);
            }}>
            Undo
          </Button>
        }>
          Removed {removedSource.source.name}. Combined results need to be generated again.{" "}
          {!canSelectSource(type, selected, removedSource.source).allowed
            && `Restore unavailable: ${canSelectSource(type, selected, removedSource.source).reason}`}
        </Alert>
      )}
      <Divider />
      <Grid container sx={{ justifyContent: "center" }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Button fullWidth variant="contained" size="medium" aria-label="Continue to combine data"
            disabled={selected.length < 2} onClick={() => { setSourcesConfirmed(true); setCurrent("combine"); }}>
            Next
          </Button>
        </Grid>
      </Grid>
    </>
  );
}

ComplexSourcesStep.propTypes = {
  setCatalogRetry: PropTypes.func,
  sourcesLoading: PropTypes.bool,
  isMulti: PropTypes.bool,
  search: PropTypes.string,
  setSearch: PropTypes.func,
  setSourcePage: PropTypes.func,
  sourceError: PropTypes.string,
  catalog: PropTypes.object,
  type: PropTypes.string,
  configuration: PropTypes.object,
  addSource: PropTypes.func,
  sourcePage: PropTypes.number,
  requestRemove: PropTypes.func,
  removedSource: PropTypes.object,
  change: PropTypes.func,
  setRemovedSource: PropTypes.func,
  setSourcesConfirmed: PropTypes.func,
  setCurrent: PropTypes.func,
  sortBy: PropTypes.string.isRequired,
  sortDirection: PropTypes.oneOf(["asc", "desc"]).isRequired,
  onSort: PropTypes.func.isRequired,
  pageSize: PropTypes.number.isRequired,
  setPageSize: PropTypes.func.isRequired,
  compatibleOnly: PropTypes.bool,
  setCompatibleOnly: PropTypes.func.isRequired,
  previewIndicator: PropTypes.func.isRequired,
};
