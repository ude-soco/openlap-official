import {
  Box,
  Button,
  Collapse,
  Divider,
  Paper,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useContext, useEffect, useState } from "react";
import { BasicContext } from "../../basic-indicator";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import VisualizationSummary from "./components/visualization-summary";
import LibrarySelection from "./components/library-selection";
import { visualizationImages } from "./utils/visualization-data";
import TypeSelection from "./components/type-selection";
import InputsSelection from "./components/inputs-selection";
import { requestBasicIndicatorPreview } from "./utils/visualization-api";
import {
  buildAnalysisRef,
  buildIndicatorQuery,
  buildVisRef,
} from "../../utils/query-builder";

export default function Dataset() {
  const { api } = useContext(AuthContext);
  const {
    dataset,
    filters,
    analysis,
    lockedStep,
    setLockedStep,
    visualization,
  } = useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: null,
    tipDescription: `
      <b>Tip!</b><br/>
      To be decided!
    `,
  });

  // useEffect(() => {
  //   console.log("Call");
  //   handleLoadPreviewVisualization().then((response) => {
  //     console.log(response);
  //   });
  // }, [visualization.selectedType.chartInputs, analysis.analyzedData]);

  const handleDatasetPopoverAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

  const handleLoadPreviewVisualization = async () => {
    let indicatorQuery = buildIndicatorQuery(dataset, filters, analysis);
    let analysisRef = buildAnalysisRef(analysis);
    let visRef = buildVisRef(visualization);
    try {
      return await requestBasicIndicatorPreview(
        api,
        indicatorQuery,
        analysisRef,
        visRef
      );
    } catch (error) {
      console.error("Failed to load the visualization", error);
    }
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <VisualizationSummary />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Collapse
              in={lockedStep.visualization.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid size={{ xs: 12, md: 8 }}>
                      <LibrarySelection />
                    </Grid>
                    {visualization.typeList.length > 0 ? (
                      <>
                        <Grid size={{ xs: 12, md: 8 }}>
                          <TypeSelection />
                        </Grid>
                      </>
                    ) : undefined}
                    {visualization.selectedType.chartInputs.length > 0 ? (
                      <>
                        <Grid size={{ xs: 12 }} sx={{ pt: 2 }}>
                          <Divider />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                          <InputsSelection />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
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
                              Click "Preview" to generate the visualization.
                            </Typography>
                            <Button
                              variant="contained"
                              onClick={handleLoadPreviewVisualization}
                            >
                              Preview
                            </Button>
                          </Box>
                        </Grid>
                      </>
                    ) : undefined}
                    <Grid size={{ xs: 12 }}>
                      <Divider />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Grid container justifyContent="center">
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            // disabled={handleCheckDisabled()}
                            // onClick={handleUnlockPath}
                          >
                            Save Indicator
                          </Button>
                        </Grid>
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
