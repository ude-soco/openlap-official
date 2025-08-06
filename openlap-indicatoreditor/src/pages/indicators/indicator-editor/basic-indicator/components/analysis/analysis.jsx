import { useContext } from "react";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "../../basic-indicator";
import {
  Box,
  Button,
  Collapse,
  Divider,
  Paper,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import AnalysisSummary from "./components/analysis-summary";
import AnalysisSelection from "./components/analysis-selection";
import InputsSelection from "./components/inputs-selection";
import ParamsSelection from "./components/params-selection";
import { fetchAnalyzedData } from "./utils/analysis-api";
import { buildAnalysisRef, buildIndicatorQuery } from "./utils/query-builder";
import AnalyzedDataTable from "./components/analyzed-data-table";

export default function Analysis() {
  const { api } = useContext(AuthContext);
  const { dataset, filters, lockedStep, setLockedStep, analysis, setAnalysis } =
    useContext(BasicContext);

  const handlePreviewAnalyzedData = async () => {
    let indicatorQuery = buildIndicatorQuery(dataset, filters, analysis);
    let analysisRef = buildAnalysisRef(analysis);
    try {
      const analyzedData = await fetchAnalyzedData(
        api,
        indicatorQuery,
        analysisRef
      );
      setAnalysis((p) => ({
        ...p,
        analyzedData: analyzedData.data,
      }));
    } catch (error) {
      console.error("Error analyzing data:", error);
    }
  };

  const handleCheckDisabled = () => {
    return Object.keys(analysis.analyzedData).length === 0;
  };

  const handleUnlockPath = () => {
    setLockedStep((p) => ({
      ...p,
      analysis: { ...p.analysis, openPanel: !p.analysis.openPanel },
      filters: { ...p.filters, locked: false, openPanel: true },
    }));
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <AnalysisSummary />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Collapse
              in={lockedStep.analysis.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Grid container spacing={3}>
                        <Grid size={{ xs: 12 }}>
                          <AnalysisSelection />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <Divider />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <InputsSelection />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <ParamsSelection />
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
                                Click "Preview" to run the analysis of your
                                data.
                              </Typography>
                              <Button
                                variant="contained"
                                onClick={handlePreviewAnalyzedData}
                              >
                                Preview
                              </Button>
                            </Box>
                          )}
                        </Grid>
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
      </Paper>
    </>
  );
}
