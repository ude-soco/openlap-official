import PropTypes from "prop-types";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
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
}) {
  return (
    <>
      <Alert severity="info">
        {isMulti
          ? "Only rows whose matching value appears in every selected indicator are included. Unmatched rows are excluded; values are not filled or normalized."
          : "All matching values from every selected indicator are included. Absent numeric measures are filled with zero and marked in the preview."}
      </Alert>
      {configuration.sources.map((source) => (
        <SectionCard
          key={source.id}
          title={source.name}
          helper={`Analytics method: ${source.analyticsMethod?.name || "Unknown"}`}
          action={
            <Button
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
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
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
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
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
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
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
            </Grid>
          </Grid>
          {source.filterSummary && (
            <Typography variant="caption" color="text.secondary">
              {typeof source.filterSummary === "string"
                ? source.filterSummary
                : JSON.stringify(source.filterSummary)}
            </Typography>
          )}
          <Button
            size="small"
            disabled={Boolean(busy)}
            onClick={() => previewSourceData(source)}
          >
            Preview source data
          </Button>
        </SectionCard>
      ))}
      <Failure
        message={
          operationError.step === "combine" || operationError.step === "source"
            ? operationError.message
            : ""
        }
      />
      <Button
        variant="outlined"
        disabled={!sourcesReady(configuration.sources) || Boolean(busy)}
        onClick={combine}
      >
        {busy === "combine" ? (
          <CircularProgress size={20} />
        ) : (
          "Generate combined data"
        )}
      </Button>
      {merged && (
        <>
          <ResultTable dataset={merged} title="Combined data preview" />
          {(merged.sources || []).map((source) => (
            <Typography variant="caption" key={source.indicatorId}>
              {source.label}: {source.includedRows} included ·{" "}
              {source.excludedRows} excluded from {source.inputRows} source rows
            </Typography>
          ))}
          <Button
            variant="contained"
            disabled={!datasetRows(merged)}
            onClick={() => setCurrent(isMulti ? "analysis" : "visualization")}
          >
            Continue to {isMulti ? "analysis" : "visualization"}
          </Button>
        </>
      )}
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
};
