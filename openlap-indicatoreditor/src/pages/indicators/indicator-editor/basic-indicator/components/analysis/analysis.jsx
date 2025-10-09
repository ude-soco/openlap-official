import { useContext, useState } from "react";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "../../basic-indicator";
import {
  Box,
  Button,
  Collapse,
  Container,
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
        <Stack>
          <AnalysisSummary />
          <Collapse
            in={lockedStep.analysis.openPanel}
            timeout={{ enter: 500, exit: 250 }}
            unmountOnExit
          >
            <Stack gap={2}>
              <Container maxWidth="lg">
                <Stack gap={3}>
                  <AnalysisSelection />
                  {analysis.inputs.length !== 0 ? (
                    <>
                      <Grid container spacing={2}>
                        <Grid
                          size={{
                            xs: 12,
                            lg: analysis.params.length !== 0 ? 6 : 12,
                          }}
                        >
                          <InputsSelection />
                        </Grid>
                        {analysis.params.length !== 0 ? (
                          <Grid size={{ xs: 12, lg: 6 }}>
                            <ParamsSelection />
                          </Grid>
                        ) : undefined}
                      </Grid>
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
                            Click "Preview" to run the analysis and view of the
                            analyzed data.
                          </Typography>
                          <Button
                            loading={state.loadingPreview}
                            loadingPosition="start"
                            loadingIndicator="Please wait..."
                            autoFocus
                            variant="contained"
                            disabled={handleCheckPreviewDisabled()}
                            onClick={handlePreviewAnalyzedData}
                          >
                            {!state.loadingPreview && "Preview"}
                          </Button>
                          {handleCheckPreviewDisabled() && (
                            <CustomTooltip
                              type="help"
                              message={`The button is disabled because:<br/>
                              ● The required <b>Input(s)</b> of the analytics method is/are not selected.<br/>
                              ● In <b>Filters</b>, under all <b>Activity filters</b>, none of the <b>Activities</b> are possibly not selected.
                              `}
                            />
                          )}
                        </Box>
                      )}
                    </>
                  ) : analysis.selectedAnalyticsMethod.method.id.length > 0 ? (
                    <LinearProgress />
                  ) : undefined}
                </Stack>
              </Container>
              <Divider />
              <Container maxWidth="sm">
                <Button
                  fullWidth
                  variant="contained"
                  disabled={handleCheckDisabled()}
                  onClick={handleUnlockPath}
                >
                  Next
                </Button>
              </Container>
            </Stack>
          </Collapse>
        </Stack>
      </CustomPaper>
    </>
  );
}
