import PropTypes from "prop-types";
import {
  Autocomplete,
  Button,
  CircularProgress,
  LinearProgress,
  TextField,
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
  return (
    <>
      <SectionCard
        title="Analytics method"
        helper="Apply another analysis to the combined columns. Only installed methods are listed."
      >
        <Autocomplete
          fullWidth
          options={methods}
          getOptionKey={(option) => option.id}
          value={methods.find((method) => method.id === methodId) || null}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          getOptionLabel={(option) =>
            methods.filter((method) => method.name === option.name).length > 1
              ? `${option.name} · ${option.id.slice(-6)}`
              : option.name || ""
          }
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
            <TextField {...params} label="Analytics method" />
          )}
        />
      </SectionCard>
      {methodLoading && (
        <LinearProgress aria-label="Loading method inputs and parameters" />
      )}
      {methodId && !methodLoading && (
        <>
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
            helper="Map the method's inputs to columns from the combined data, then review the parameters."
          />
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
        </>
      )}
      <Failure
        message={
          operationError.step === "analysis" ? operationError.message : ""
        }
        retry={
          operationError.step === "analysis" && methodContractId !== methodId
            ? () => setCatalogRetry((value) => value + 1)
            : undefined
        }
      />
      <Button
        variant="outlined"
        disabled={
          !methodId ||
          methodLoading ||
          methodContractId !== methodId ||
          !mappingsReady(
            methodInputs,
            configuration.analysis.mapping,
            merged,
          ) ||
          Boolean(busy)
        }
        onClick={analyze}
      >
        {busy === "analysis" ? (
          <CircularProgress size={20} />
        ) : (
          "Generate analysis preview"
        )}
      </Button>
      {analyzed && (
        <>
          <ResultTable dataset={analyzed} title="Analysis data preview" />
          <Button
            variant="contained"
            disabled={!datasetRows(analyzed)}
            onClick={() => setCurrent("visualization")}
          >
            Continue to visualization
          </Button>
        </>
      )}
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
