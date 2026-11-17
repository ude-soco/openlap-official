import PropTypes from "prop-types";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SectionCard from "../../../../common/components/section-card/section-card";
import { datasetRows, sourcesReady } from "./complex-model";
import { Failure, ResultTable } from "./complex-controls";

export default function ComplexCombineStep({
  isMulti,
  configuration,
  updateSource,
  busy,
  previewSourceData,
  operationError,
  combine,
  merged,
  setCurrent,
  onEditSource,
}) {
  const previewError =
    operationError.step === "combine" ? operationError.message : "";
  const previewLoading = busy === "combine";

  return (
    <>
      <Alert severity="info">
        {isMulti
          ? "Only rows whose matching value appears in every selected indicator are included. Unmatched rows are excluded; values are not filled or normalized."
          : "All matching values from every selected indicator are included. Absent numeric measures are filled with zero and marked in the preview."}
      </Alert>
      <Grid container spacing={2} sx={{ alignItems: "stretch", minWidth: 0 }}>
        {configuration.sources.map((source) => (
          <Grid
            key={source.id}
            size={{ xs: 12, lg: 6 }}
            sx={{
              display: "flex",
              minWidth: 0,
              "& .MuiTypography-root": { overflowWrap: "anywhere" },
            }}
          >
            <SectionCard
              title={source.name}
              helper={`Analytics method: ${source.analyticsMethod?.name || "Unknown"}`}
              action={
                onEditSource ? <Button size="small" onClick={() => onEditSource(source.id)}>Edit source</Button> : <Button
                  component={RouterLink}
                  to={`/indicator/${source.id}`}
                  target="_blank"
                  rel="noopener"
                  size="small"
                >
                  View source
                </Button>
              }
            >
              <Stack sx={{ gap: 2, minWidth: 0 }}>
                <TextField
                  select
                  fullWidth
                  label={`Match rows from ${source.name} by`}
                  value={source.keyColumnId}
                  onChange={(event) =>
                    updateSource(source.id, {
                      keyColumnId: event.target.value,
                      measureColumnIds: source.measureColumnIds.filter(
                        (column) => column !== event.target.value,
                      ),
                    })
                  }
                  helperText="Choose a unique, nonempty identifier. Matching values must use the same type."
                >
                  {source.outputs.map((column) => (
                    <MenuItem key={column.id} value={column.id}>
                      {column.title || column.id} ({column.type})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  label={`Measures from ${source.name}`}
                  value={source.measureColumnIds}
                  slotProps={{ select: { multiple: true } }}
                  onChange={(event) =>
                    updateSource(source.id, {
                      measureColumnIds: event.target.value,
                    })
                  }
                  helperText="Choose numerical measures to include."
                >
                  {source.outputs
                    .filter(
                      (column) =>
                        column.type === "Numeric" &&
                        column.id !== source.keyColumnId,
                    )
                    .map((column) => (
                      <MenuItem key={column.id} value={column.id}>
                        {column.title || column.id}
                      </MenuItem>
                    ))}
                </TextField>
                <TextField
                  fullWidth
                  label={`Series label for ${source.name}`}
                  value={source.label}
                  onChange={(event) =>
                    updateSource(source.id, { label: event.target.value })
                  }
                  slotProps={{ htmlInput: { maxLength: 150 } }}
                  helperText="Use a short chart label. The original source name remains visible in this review."
                />
              </Stack>
              {source.filterSummary && (
                <Typography variant="caption" color="text.secondary">
                  {typeof source.filterSummary === "string"
                    ? source.filterSummary
                    : JSON.stringify(source.filterSummary)}
                </Typography>
              )}
              <Stack direction="row" sx={{ justifyContent: "center", mt: 2 }}>
                <Button
                  variant="contained"
                  size="medium"
                  disabled={Boolean(busy)}
                  onClick={() => previewSourceData(source)}
                >
                  {onEditSource ? "Review source data" : "Preview source data"}
                </Button>
              </Stack>
            </SectionCard>
          </Grid>
        ))}
      </Grid>
      <Failure
        message={
          operationError.step === "source"
            ? operationError.message
            : ""
        }
      />
      <SectionCard
        title="Preview results"
        helper="The preview updates automatically when the matching columns, measures, or series labels change."
      >
        {previewLoading ? (
          <Stack sx={{ gap: 1.5, alignItems: "center", py: 3 }}>
            <CircularProgress aria-label="Combining source data" />
            <Typography variant="body2" color="text.secondary">
              Combining data…
            </Typography>
          </Stack>
        ) : previewError ? (
          <Failure message={previewError} />
        ) : merged ? (
          <>
            <ResultTable
              dataset={merged}
              title="Combined data preview"
              framed={false}
            />
            {(merged.sources || []).length > 0 && (
              <Stack sx={{ gap: 0.5 }}>
                {merged.sources.map((source) => (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    key={source.indicatorId}
                  >
                    {source.label}: {source.includedRows} included ·{" "}
                    {source.excludedRows} excluded from {source.inputRows} source rows
                  </Typography>
                ))}
              </Stack>
            )}
          </>
        ) : (
          <Stack sx={{ alignItems: "center", py: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Choose each source&apos;s matching column and measures. Your combined
              data will appear automatically once all sources are ready.
            </Typography>
          </Stack>
        )}
        <Stack direction="row" sx={{ justifyContent: "center", mt: 2 }}>
          <Button
            variant="contained"
            size="medium"
            disabled={!sourcesReady(configuration.sources) || Boolean(busy)}
            onClick={combine}
          >
            {previewLoading
              ? "Combining data…"
              : previewError
                ? "Try again"
                : merged
                  ? "Run preview again"
                  : "Preview"}
          </Button>
        </Stack>
      </SectionCard>
      <Divider />
      <Grid container sx={{ justifyContent: "center" }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Button
            fullWidth
            variant="contained"
            size="medium"
            aria-label={`Continue to ${isMulti ? "analysis" : "visualization"}`}
            disabled={
              !datasetRows(merged) || Boolean(previewError) || Boolean(busy)
            }
            onClick={() => setCurrent(isMulti ? "analysis" : "visualization")}
          >
            Next
          </Button>
        </Grid>
      </Grid>
    </>
  );
}
ComplexCombineStep.propTypes = {
  isMulti: PropTypes.bool,
  configuration: PropTypes.object,
  updateSource: PropTypes.func,
  busy: PropTypes.string,
  previewSourceData: PropTypes.func,
  operationError: PropTypes.object,
  combine: PropTypes.func,
  merged: PropTypes.object,
  setCurrent: PropTypes.func,
  onEditSource: PropTypes.func,
};
