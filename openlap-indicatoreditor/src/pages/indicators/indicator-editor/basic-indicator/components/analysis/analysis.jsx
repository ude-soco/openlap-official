import { useContext, useState } from "react";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "../../basic-indicator";
import {
  Box,
  Button,
  Collapse,
  Divider,
  Grid,
  LinearProgress,
  Typography,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
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
import CustomPaper from "../../../../../../common/components/custom-paper/custom-paper.jsx";

export default function Analysis() {
  const { api } = useContext(AuthContext);
  const { dataset, filters, lockedStep, setLockedStep, analysis, setAnalysis } =
    useContext(BasicContext);
  const [state, setState] = useState({ loadingPreview: false });

  const handlePreviewAnalyzedData = async () => {
    let indicatorQuery = buildIndicatorQuery(dataset, filters, analysis);
    let analysisRef = buildAnalysisRef(analysis);
    setState((p) => ({ ...p, loadingPreview: true }));
    try {
      const analyzedData = await fetchAnalyzedData(
        api,
        indicatorQuery,
        analysisRef
      );
      setAnalysis((p) => ({ ...p, analyzedData: analyzedData.data }));
      setState((p) => ({ ...p, loadingPreview: false }));
    } catch (error) {
      setState((p) => ({ ...p, loadingPreview: false }));
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

  return (
    <>
      <CustomPaper locked={lockedStep.analysis.locked}>
        <Grid container>
          <Grid size={{ xs: 12 }}>
            <AnalysisSummary />
            <Collapse
              in={lockedStep.analysis.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid size={{ xs: 12, lg: 8 }}>
                      <Grid container spacing={3}>
                        <Grid size={{ xs: 12 }}>
                          <AnalysisSelection />
                        </Grid>

                        {analysis.inputs.length !== 0 ? (
                          <>
                            <Grid size={{ xs: 12 }}>
                              <Grid container spacing={2}>
                                <Grid
                                  size={{
                                    xs: 12,
                                    md: analysis.params.length !== 0 ? 6 : 12,
                                  }}
                                >
                                  <InputsSelection />
                                </Grid>
                                {analysis.params.length !== 0 ? (
                                  <Grid size={{ xs: 12, md: 6 }}>
                                    <ParamsSelection />
                                  </Grid>
                                ) : undefined}
                              </Grid>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              {Object.keys(analysis.analyzedData).length ? (
                                <AnalyzedDataTable />
                              ) : (
                                <Box
                                  sx={{
                                    mt: 2,
                                    pb: 1,
                                    p: 8,
                                    border: "1px dashed",
                                    borderColor: "divider",
                                    borderRadius: 2,
                                    textAlign: "center",
                                    color: "text.secondary",
                                  }}
                                >
                                  <Typography variant="body1" gutterBottom>
                                    Click "Preview" to run the analysis and view
                                    of the analyzed data.
                                  </Typography>
                                  <Grid container justifyContent="center">
                                    <LoadingButton
                                      loading={state.loadingPreview}
                                      loadingIndicator="Loading…"
                                      autoFocus
                                      variant="contained"
                                      disabled={handleCheckPreviewDisabled()}
                                      onClick={handlePreviewAnalyzedData}
                                    >
                                      <span>Preview</span>
                                    </LoadingButton>
                                    {handleCheckPreviewDisabled() && (
                                      <CustomTooltip
                                        type="help"
                                        message={`The button is disabled because:<br/>
                                        ● The required <b>Input(s)</b> of the analytics method may not selected.<br/>
                                        ● In <b>Filters</b>, under all <b>Activity filters</b>, none of the <b>Activities</b> are possibly not selected.
                                        `}
                                      />
                                    )}
                                  </Grid>
                                </Box>
                              )}
                            </Grid>
                          </>
                        ) : analysis.selectedAnalyticsMethod.method.id.length >
                          0 ? (
                          <Grid size={{ xs: 12 }}>
                            <LinearProgress />
                          </Grid>
                        ) : undefined}
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid size={{ xs: 12 }} sx={{ py: 2 }}>
                    <Divider />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
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
                  </Grid>
                </Grid>
              </Grid>
            </Collapse>
          </Grid>
        </Grid>
      </CustomPaper>
    </>
  );
}
