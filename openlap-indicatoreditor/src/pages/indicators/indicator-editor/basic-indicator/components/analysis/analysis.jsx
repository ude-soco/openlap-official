import { useContext, useEffect, useRef, useState } from "react";
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
import { fetchAnalyzedData } from "./utils/analysis-api";
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

export default function Analysis() {
  const { api } = useContext(AuthContext);
  const { dataset, filters, lockedStep, setLockedStep, analysis, setAnalysis } =
    useContext(BasicContext);
  const [state, setState] = useState({
    loadingPreview: false,
    previewError: false,
    previewComplete: false,
  });
  const requestVersion = useRef(0);
  const indicatorQuery = buildIndicatorQuery(dataset, filters, analysis);
  const analysisRef = buildAnalysisRef(analysis);
  const selectionKey = JSON.stringify({ indicatorQuery, ...analysisRef });

  // Discard requests for selections that changed while the analysis was running.
  useEffect(() => {
    setState({ loadingPreview: false, previewError: false, previewComplete: false });
    return () => { requestVersion.current += 1; };
  }, [selectionKey]);

  const handlePreviewAnalyzedData = async () => {
    const version = ++requestVersion.current;
    setState({ loadingPreview: true, previewError: false, previewComplete: false });
    setAnalysis((p) => ({ ...p, analyzedData: {} }));
    try {
      const analyzedData = await fetchAnalyzedData(
        api,
        indicatorQuery,
        analysisRef
      );
      if (version !== requestVersion.current) return;
      setAnalysis((p) => ({ ...p, analyzedData: analyzedData.data }));
      setState({ loadingPreview: false, previewError: false, previewComplete: true });
    } catch (error) {
      if (version !== requestVersion.current) return;
      setState({ loadingPreview: false, previewError: true, previewComplete: false });
      console.error("Error analyzing data:", error);
    }
  };

  const handleCheckDisabled = () => {
    return (
      getAnalyzedRowCount(analysis.analyzedData) === 0 ||
      state.loadingPreview || state.previewError
    );
  };

  const handleCheckPreviewDisabled = () => {
    const allEmpty = filters.selectedActivities.every(
      (activity) => activity.selectedActivityList.length === 0
    );
    return (
      analysis.selectedAnalyticsMethod.mapping.mapping.length === 0 || allEmpty
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
  const hasAnalyzedData = Object.keys(analysis.analyzedData).length > 0;
  const previewDisabled = handleCheckPreviewDisabled();

  return (
    <>
      <WorkflowSection
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
          <Stack gap={2} sx={{ py: 2 }}>
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
              <>
                <Grid container spacing={2} alignItems="stretch">
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

                <SectionCard
                  title="Preview results"
                  helper="Run the analysis to preview the data that will feed your visualization."
                >
                  {state.loadingPreview ? (
                    <Stack gap={1.5} alignItems="center" sx={{ py: 3 }}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary">
                        Running analysis…
                      </Typography>
                    </Stack>
                  ) : state.previewError ? (
                    <Alert severity="error">
                      The analysis could not be run. Please check your inputs
                      and filters, then try again.
                    </Alert>
                  ) : hasAnalyzedData || state.previewComplete ? (
                    <AnalyzedDataTable />
                  ) : (
                    <Stack alignItems="center" sx={{ py: 3, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Choose your inputs and parameters, then run a preview of
                        the analysed data.
                      </Typography>
                    </Stack>
                  )}
                  <Stack direction="row" gap={1} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      disabled={previewDisabled || state.loadingPreview}
                      onClick={handlePreviewAnalyzedData}
                    >
                      {state.loadingPreview ? "Running analysis…"
                        : state.previewError ? "Try again"
                        : hasAnalyzedData || state.previewComplete ? "Run preview again"
                        : "Preview"}
                    </Button>
                    {previewDisabled && (
                      <CustomTooltip
                        type="help"
                        message={`The Preview button is disabled until:<br/>● A required <b>Input</b> of the analytics method is selected.<br/>● At least one <b>Activity</b> is selected in <b>Filters</b>.`}
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

            <Divider />
            <Grid container justifyContent="center">
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
