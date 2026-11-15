import PropTypes from "prop-types";
import {
  Autocomplete,
  Button,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SectionCard from "../../../../common/components/section-card/section-card";
import { datasetRows, mappingsReady } from "./complex-model";
import {
  ColumnMappings,
  Failure,
  MethodParameters,
  ResultTable,
} from "./complex-controls";

export default function ComplexAnalysisStep({
  methods,
  methodId,
  change,
  methodLoading,
  methodInputs,
  merged,
  configuration,
  operationError,
  setCatalogRetry,
  methodContractId,
  busy,
  analyze,
  analyzed,
  setCurrent,
}) {
  const contractReady =
    Boolean(methodId) && !methodLoading && methodContractId === methodId;
  const previewError =
    operationError.step === "analysis" ? operationError.message : "";
  const previewLoading = busy === "analysis";
  const previewDisabled =
    !contractReady ||
    !mappingsReady(methodInputs, configuration.analysis.mapping, merged) ||
    Boolean(busy);
  const methodLabel = (option) =>
    methods.filter((method) => method.name === option.name).length > 1
      ? `${option.name} · ${option.id.slice(-6)}`
      : option.name || "";

  return (
    <>
      <SectionCard
        title="Analytics method"
        helper="Choose the analysis to apply to your combined data."
      >
        <Stack sx={{ gap: 0.75 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Analytics method
          </Typography>
          <Autocomplete
            disablePortal
            fullWidth
            options={methods}
            getOptionKey={(option) => option.id}
            value={methods.find((method) => method.id === methodId) || null}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={methodLabel}
            onChange={(_, method) =>
              change(
                (previous) => ({
                  ...previous,
                  analysis: {
                    methodId: method?.id || "",
                    mapping: { mapping: [] },
                    params: [],
                  },
                }),
                "analysis",
              )
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search for an analytics method"
                slotProps={{
                  ...params.slotProps,
                  htmlInput: {
                    ...params.slotProps.htmlInput,
                    "aria-label": "Analytics method",
                  },
                }}
              />
            )}
            renderOption={(attributes, option) => {
              const { key, ...restProps } = attributes;
              return (
                <li key={key} {...restProps}>
                  <Stack sx={{ py: 0.5 }}>
                    <Typography>{methodLabel(option)}</Typography>
                    {option.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontStyle: "italic" }}
                      >
                        {option.description}
                      </Typography>
                    )}
                  </Stack>
                </li>
              );
            }}
          />
        </Stack>
      </SectionCard>
      {methodLoading && (
        <SectionCard
          title="Method inputs"
          helper="Loading the inputs and parameters for this method…"
        >
          <LinearProgress aria-label="Loading method inputs and parameters" />
        </SectionCard>
      )}
      {contractReady && (
        <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
          <Grid
            size={{ xs: 12, lg: configuration.analysis.params.length ? 6 : 12 }}
            sx={{ display: "flex" }}
          >
            <ColumnMappings
              inputs={methodInputs}
              dataset={merged}
              mapping={configuration.analysis.mapping}
              onChange={(mapping) =>
                change(
                  (previous) => ({
                    ...previous,
                    analysis: { ...previous.analysis, mapping },
                  }),
                  "analysis",
                )
              }
              title="Method inputs"
              helper="Map each input the method needs to a column from your combined data."
            />
          </Grid>
          {configuration.analysis.params.length > 0 && (
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: "flex" }}>
              <MethodParameters
                params={configuration.analysis.params}
                onChange={(params) =>
                  change(
                    (previous) => ({
                      ...previous,
                      analysis: { ...previous.analysis, params },
                    }),
                    "analysis",
                  )
                }
              />
            </Grid>
          )}
        </Grid>
      )}
      <Failure
        message={!contractReady ? previewError : ""}
        retry={
          operationError.step === "analysis" && methodContractId !== methodId
            ? () => setCatalogRetry((value) => value + 1)
            : undefined
        }
      />
      {contractReady && (
        <SectionCard
          title="Preview results"
          helper="Run the analysis to preview the data that will feed your visualization."
        >
          {previewLoading ? (
            <Stack sx={{ gap: 1.5, alignItems: "center", py: 3 }}>
              <CircularProgress aria-label="Running analysis" />
              <Typography variant="body2" color="text.secondary">
                Running analysis…
              </Typography>
            </Stack>
          ) : previewError ? (
            <Failure message={previewError} />
          ) : analyzed ? (
            <ResultTable
              dataset={analyzed}
              title="Analysis data preview"
              framed={false}
            />
          ) : (
            <Stack sx={{ alignItems: "center", py: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Choose your inputs and parameters, then run a preview of the
                analysed data.
              </Typography>
            </Stack>
          )}
          <Stack direction="row" sx={{ justifyContent: "center", mt: 2 }}>
            <Button
              variant="contained"
              size="medium"
              disabled={previewDisabled}
              onClick={analyze}
            >
              {previewLoading
                ? "Running analysis…"
                : previewError
                  ? "Try again"
                  : analyzed
                    ? "Run preview again"
                    : "Preview"}
            </Button>
          </Stack>
        </SectionCard>
      )}
      {!methodId && (
        <Typography variant="body2" color="text.secondary">
          Select an analytics method above to configure its inputs and parameters.
        </Typography>
      )}
      <Divider />
      <Grid container sx={{ justifyContent: "center" }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Button
            fullWidth
            variant="contained"
            size="medium"
            aria-label="Continue to visualization"
            disabled={
              !datasetRows(analyzed) || Boolean(previewError) || Boolean(busy)
            }
            onClick={() => setCurrent("visualization")}
          >
            Next
          </Button>
        </Grid>
      </Grid>
    </>
  );
}
ComplexAnalysisStep.propTypes = {
  methods: PropTypes.array,
  methodId: PropTypes.string,
  change: PropTypes.func,
  methodLoading: PropTypes.bool,
  methodInputs: PropTypes.array,
  merged: PropTypes.object,
  configuration: PropTypes.object,
  operationError: PropTypes.object,
  setCatalogRetry: PropTypes.func,
  methodContractId: PropTypes.string,
  busy: PropTypes.string,
  analyze: PropTypes.func,
  analyzed: PropTypes.object,
  setCurrent: PropTypes.func,
};
