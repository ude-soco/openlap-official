import { useContext, useState } from "react";
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

export default function Analysis() {
  const { api } = useContext(AuthContext);
  const { dataset, filters, lockedStep, setLockedStep, analysis, setAnalysis } =
    useContext(BasicContext);
  const [state, setState] = useState({
    loadingPreview: false,
    previewError: false,
  });

  const handlePreviewAnalyzedData = async () => {
    let indicatorQuery = buildIndicatorQuery(dataset, filters, analysis);
    let analysisRef = buildAnalysisRef(analysis);
    setState((p) => ({ ...p, loadingPreview: true, previewError: false }));
    try {
      const analyzedData = await fetchAnalyzedData(
        api,
        indicatorQuery,
        analysisRef
      );
      setAnalysis((p) => ({ ...p, analyzedData: analyzedData.data }));
      setState((p) => ({ ...p, loadingPreview: false }));
    } catch (error) {
      setState((p) => ({ ...p, loadingPreview: false, previewError: true }));
      console.error("Error analyzing data:", error);
    }
  };

  const handleCheckDisabled = () => {
    return Object.keys(analysis.analyzedData).length === 0;
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
                  {hasAnalyzedData ? (
                    <AnalyzedDataTable />
                  ) : state.loadingPreview ? (
                    <Stack gap={1.5} alignItems="center" sx={{ py: 3 }}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary">
                        Running analysis…
                      </Typography>
                    </Stack>
                  ) : (
                    <Stack
                      gap={2}
                      alignItems="center"
                      sx={{ py: 3, textAlign: "center" }}
                    >
                      {state.previewError && (
                        <Alert severity="error" sx={{ width: "100%" }}>
                          The analysis could not be run. Please check your inputs
                          and filters, then try again.
                        </Alert>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {state.previewError
                          ? "Adjust your selections and run the preview again."
                          : "Choose your inputs and parameters, then run a preview of the analysed data."}
                      </Typography>
                      <Stack direction="row" gap={1} alignItems="center">
                        <Button
                          variant="contained"
                          disabled={previewDisabled}
                          onClick={handlePreviewAnalyzedData}
                        >
                          {state.previewError ? "Try again" : "Preview"}
                        </Button>
                        {previewDisabled && (
                          <CustomTooltip
                            type="help"
                            message={`The Preview button is disabled until:<br/>● A required <b>Input</b> of the analytics method is selected.<br/>● At least one <b>Activity</b> is selected in <b>Filters</b>.`}
                          />
                        )}
                      </Stack>
                    </Stack>
                  )}
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
