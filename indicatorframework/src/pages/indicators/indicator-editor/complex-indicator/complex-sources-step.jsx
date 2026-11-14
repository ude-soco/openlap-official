import PropTypes from "prop-types";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  LinearProgress,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SectionCard from "../../../../common/components/section-card/section-card";
import { canSelectSource } from "./complex-model";
import { Failure } from "./complex-controls";

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
}) {
  return (
    <>
      <SectionCard
        title="Your Basic indicators"
        action={
          <Button
            size="small"
            onClick={() => setCatalogRetry((value) => value + 1)}
            disabled={sourcesLoading}
          >
            Refresh sources
          </Button>
        }
        helper={
          isMulti
            ? "Choose two to ten saved Basic indicators with a shared matching field. Analytics methods may differ."
            : "Choose two to ten saved Basic indicators. The first selection sets the required analytics method."
        }
      >
        <TextField
          fullWidth
          type="search"
          label="Search your Basic indicators"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setSourcePage(0);
          }}
        />
        <Failure
          message={sourceError}
          retry={() => setCatalogRetry((value) => value + 1)}
        />
        {sourcesLoading && (
          <LinearProgress aria-label="Loading Basic indicators" />
        )}
        {!sourcesLoading && !sourceError && !catalog.content?.length && (
          <Alert severity="info">
            No Basic indicators found.{" "}
            <Button
              component={RouterLink}
              to="/indicator/editor/basic"
              size="small"
              target="_blank"
              rel="noopener"
            >
              Create a Basic indicator
            </Button>{" "}
            Your complex-indicator selections stay in this tab.
          </Alert>
        )}
        <Grid container spacing={2}>
          {(catalog.content || []).map((source) => {
            const selection = canSelectSource(
              type,
              configuration.sources,
              source,
            );
            return (
              <Grid size={{ xs: 12, md: 6 }} key={source.id}>
                <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                  <Stack sx={{ gap: 1 }}>
                    <Typography fontWeight={600}>{source.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {source.analyticsMethod?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(source.outputs || [])
                        .map(
                          (column) =>
                            `${column.title || column.id} (${column.type})`,
                        )
                        .join(" · ")}
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      variant="outlined"
                      disabled={!selection.allowed}
                      onClick={() => addSource(source)}
                      aria-label={`Select ${source.name}`}
                    >
                      Select indicator
                    </Button>
                    {!selection.allowed && (
                      <Typography variant="caption" color="text.secondary">
                        {selection.reason}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
        {catalog.totalPages > 1 && (
          <Pagination
            count={catalog.totalPages}
            page={sourcePage + 1}
            onChange={(_, page) => setSourcePage(page - 1)}
            aria-label="Basic indicator pages"
          />
        )}
      </SectionCard>
      {configuration.sources.length > 0 && (
        <SectionCard
          title="Selected indicators"
          helper="Selections are retained while you search or move between pages."
        >
          <Stack sx={{ gap: 1 }}>
            {configuration.sources.map((source) => (
              <Stack
                key={source.id}
                direction="row"
                sx={{ alignItems: "center", gap: 1 }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={500}>{source.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {source.analyticsMethod?.name}
                  </Typography>
                </Box>
                <IconButton
                  aria-label={`Remove ${source.name}`}
                  onClick={() => requestRemove(source)}
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </SectionCard>
      )}
      {removedSource && (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit"
              disabled={
                !canSelectSource(
                  type,
                  configuration.sources,
                  removedSource.source,
                ).allowed
              }
              onClick={() => {
                change(
                  (previous) => ({
                    ...previous,
                    sources: [
                      ...previous.sources.slice(0, removedSource.index),
                      removedSource.source,
                      ...previous.sources.slice(removedSource.index),
                    ],
                  }),
                  "sources",
                );
                setRemovedSource(null);
              }}
            >
              Undo
            </Button>
          }
        >
          Removed {removedSource.source.name}. Combined results need to be
          generated again.{" "}
          {!canSelectSource(type, configuration.sources, removedSource.source)
            .allowed &&
            `Restore unavailable: ${canSelectSource(type, configuration.sources, removedSource.source).reason}`}
        </Alert>
      )}
      <Button
        variant="contained"
        disabled={configuration.sources.length < 2}
        onClick={() => {
          setSourcesConfirmed(true);
          setCurrent("combine");
        }}
      >
        Continue to combine data
      </Button>
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
};
