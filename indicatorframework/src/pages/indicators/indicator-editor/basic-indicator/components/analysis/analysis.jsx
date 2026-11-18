import CommunityComparison from "../../../../../../common/components/community-adaptation/community-comparison.jsx";
import { useContext, useEffect } from "react";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "../../basic-indicator";
import {
  Alert,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import AnalysisSummary from "./components/analysis-summary";
import AnalysisSelection from "./components/analysis-selection";
import InputsSelection from "./components/inputs-selection";
import ParamsSelection from "./components/params-selection";
import {
  buildAnalysisRef,
  buildIndicatorQuery,
} from "../../utils/query-builder.js";
import AnalyzedDataTable from "./components/analyzed-data-table";
import CustomTooltip from "../../../../../../common/components/custom-tooltip/custom-tooltip.jsx";
import WorkflowSection from "../../../../../../common/components/workflow-section/workflow-section.jsx";
import SectionCard from "../../../../../../common/components/section-card/section-card.jsx";
import { getStepStatus } from "../../utils/basic-workflow-ui.js";
import { getAnalyzedRowCount } from "../../utils/analyzed-data.js";
import useDataPreview from "../../../utils/use-data-preview";
import { basicAnalysisReady } from "../../../utils/analysis-readiness.js";

const EMPTY_COLUMNS = {};

export default function Analysis() {
  const { api } = useContext(AuthContext);
  const { dataset, filters, lockedStep, setLockedStep, analysis, setAnalysis, setVisualization, referencesValid, comparisonReference, configuration } =
    useContext(BasicContext);
  const indicatorQuery = buildIndicatorQuery(dataset, filters, analysis);
  const analysisRef = buildAnalysisRef(analysis);
  const selectionKey = JSON.stringify({ indicatorQuery, ...analysisRef });
  const ready = referencesValid !== false && !lockedStep.analysis.locked && basicAnalysisReady(dataset, filters, analysis);
  const preview = useDataPreview({
    api,
    path: "v1/indicators/basic/analyze",
    fingerprint: selectionKey,
    ready,
  });
  const columns = preview.data?.columns || EMPTY_COLUMNS;

  // Share only current results with Visualization and saving. Invalidating a
  // request clears the old chart without resetting its type or customization.
  useEffect(() => {
    setAnalysis((previous) => previous.analyzedData === columns
      ? previous : { ...previous, analyzedData: columns });
    if (!preview.data || !getAnalyzedRowCount(columns)) {
      setVisualization((previous) => previous.previewData?.displayCode?.length ||
        Object.keys(previous.previewData?.scriptData || {}).length
        ? { ...previous, previewData: { displayCode: [], scriptData: {} } }
        : previous);
    }
  }, [columns, preview.data, setAnalysis, setVisualization]);

  const handleCheckDisabled = () => {
    return (
      getAnalyzedRowCount(columns) === 0 || preview.loading || Boolean(preview.error)
    );
  };

  const handleUnlockPath = () => {
    setLockedStep((p) => ({
      ...p,
      analysis: { ...p.analysis, openPanel: !p.analysis.openPanel },
      visualization: { ...p.visualization, locked: false, openPanel: true },
    }));
  };

  const methodSelected =
    analysis.selectedAnalyticsMethod.method.id.length > 0;
  const previewComplete = Boolean(preview.data);
  const previewDisabled = !ready;

  return (
    <>
      <WorkflowSection
        stepKey="analysis"
        status={getStepStatus(lockedStep, "analysis")}
        lockedHint="Complete Filters to unlock Analysis."
        ariaLabel="Analysis step"
      >
        <AnalysisSummary />
        <Collapse
          in={lockedStep.analysis.openPanel}
          timeout={{ enter: 500, exit: 250 }}
          unmountOnExit
        >
          <Stack sx={{ gap: 2, py: 2 }}>
            <CommunityComparison step="analysis" reference={comparisonReference} configuration={configuration}>
            <AnalysisSelection />

            {methodSelected && analysis.inputs.length === 0 && (
              <SectionCard
                title="Method inputs"
                helper="Loading the inputs for this method…"
              >
                <LinearProgress aria-label="Loading method inputs" />
              </SectionCard>
            )}

            {analysis.inputs.length !== 0 && (
                <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
                  <Grid
                    size={{
                      xs: 12,
                      lg: analysis.params.length !== 0 ? 6 : 12,
                    }}
                    sx={{ display: "flex" }}
                  >
                    <InputsSelection />
                  </Grid>
                  {analysis.params.length !== 0 && (
                    <Grid size={{ xs: 12, lg: 6 }} sx={{ display: "flex" }}>
                      <ParamsSelection />
                    </Grid>
                  )}
                </Grid>
            )}
            {analysis.inputs.length !== 0 && (
              <>
                <SectionCard
                  title="Preview results"
                  helper="The preview updates automatically when the required inputs and parameters are valid."
                >
                  {preview.loading ? (
                    <Stack sx={{ gap: 1.5, alignItems: "center", py: 3 }}>
                      <CircularProgress aria-label="Running analysis" />
                      <Typography variant="body2" color="text.secondary" role="status">
                        Running analysis…
                      </Typography>
                    </Stack>
                  ) : preview.error ? (
                    <Alert severity="error">
                      {preview.error}
                    </Alert>
                  ) : previewComplete ? (
                    <AnalyzedDataTable data={columns} />
                  ) : (
                    <Stack sx={{ alignItems: "center", py: 3, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Complete the required inputs, parameters, and filters.
                        Your analysed data will appear automatically.
                      </Typography>
                    </Stack>
                  )}
                  <Stack direction="row" sx={{ gap: 1, alignItems: "center", justifyContent: "center", mt: 2 }}>
                    <Button
                      variant="contained"
                      disabled={previewDisabled || preview.loading}
                      onClick={preview.retry}
                    >
                      {preview.loading ? "Running analysis…"
                        : preview.error ? "Try again"
                        : previewComplete ? "Run preview again"
                        : "Preview"}
                    </Button>
                    {previewDisabled && (
                      <CustomTooltip
                        type="help"
                        message={`The preview updates when:<br/>● All required method <b>Inputs</b> are mapped.<br/>● Required <b>Parameters</b> contain valid values.<br/>● The dataset and activity <b>Filters</b> are complete.`}
                      />
                    )}
                  </Stack>
                </SectionCard>
              </>
            )}

            {!methodSelected && (
              <Typography variant="body2" color="text.secondary">
                Select an analytics method above to configure its inputs and
                parameters.
              </Typography>
            )}

            </CommunityComparison>
            <Divider />
            <Grid container sx={{ justifyContent: "center" }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={handleCheckDisabled()}
                  onClick={handleUnlockPath}
                >
                  Next
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </Collapse>
      </WorkflowSection>
    </>
  );
}
