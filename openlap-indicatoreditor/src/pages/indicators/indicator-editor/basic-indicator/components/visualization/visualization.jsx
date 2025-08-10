import {
  Button,
  Collapse,
  Divider,
  LinearProgress,
  Paper,
  Skeleton,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useContext, useEffect } from "react";
import { BasicContext } from "../../basic-indicator";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import VisualizationSummary from "./components/visualization-summary";
import LibrarySelection from "./components/library-selection";
import TypeSelection from "./components/type-selection";
import { requestBasicIndicatorPreview } from "./utils/visualization-api";
import {
  buildAnalysisRef,
  buildIndicatorQuery,
  buildVisRef,
} from "../../utils/query-builder";
import TypeInputSelection from "./components/type-input-selection";
import ChartPreview from "./components/chart-preview";
import ChartCustomizationPanel from "./components/customization/chart-customization-panel";
import CustomPaper from "../../../../../../common/components/custom-paper/custom-paper";

export default function Visualization() {
  const { api } = useContext(AuthContext);
  const {
    dataset,
    filters,
    analysis,
    lockedStep,
    visualization,
    setVisualization,
  } = useContext(BasicContext);

  useEffect(() => {
    if (
      visualization.inputs.length !== 0 &&
      allInputsHaveSelected(visualization.inputs)
    )
      handleLoadPreviewVisualization().then((previewData) => {
        setVisualization((p) => ({
          ...p,
          previewData: {
            ...p.previewData,
            displayCode: previewData.displayCode,
            scriptData: previewData.scriptData,
          },
        }));
      });
  }, [visualization.inputs, visualization.params]);

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

  // * Helper function
  function allInputsHaveSelected(chartInputs) {
    return chartInputs.every((input) => {
      const selected = input.selectedInput;
      return (
        selected &&
        typeof selected === "object" &&
        Object.keys(selected).length > 0
      );
    });
  }

  return (
    <>
      <CustomPaper locked={lockedStep.visualization.locked}>
        <Grid container>
          <Grid size={{ xs: 12 }}>
            <VisualizationSummary />
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
                    <Grid size={{ xs: 12, md: 8 }}>
                      {visualization.selectedLibrary.id ? (
                        visualization.typeList.length > 0 ? (
                          <TypeSelection />
                        ) : (
                          <LinearProgress />
                        )
                      ) : undefined}
                    </Grid>
                    <>
                      {visualization.inputs.length > 0 ? (
                        <>
                          <Grid size={{ xs: 12 }} sx={{ py: 2 }}>
                            <TypeInputSelection />
                          </Grid>

                          <Grid size={{ xs: 12 }}>
                            <Grid container spacing={2}>
                              <Grid size={{ xs: 12, lg: "grow", xl: 8 }}>
                                {visualization.previewData.displayCode
                                  .length !== 0 ? (
                                  <Grid
                                    container
                                    component={Paper}
                                    variant="outlined"
                                    justifyContent="center"
                                    sx={{ backgroundColor: "white", p: 3 }}
                                  >
                                    <ChartPreview />
                                  </Grid>
                                ) : (
                                  <Skeleton
                                    variant="rectangular"
                                    height={565}
                                  />
                                )}
                              </Grid>
                              <Grid size={{ xs: 12, md: "grow" }}>
                                <ChartCustomizationPanel />
                              </Grid>
                            </Grid>
                          </Grid>
                        </>
                      ) : undefined}
                    </>
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
      </CustomPaper>
    </>
  );
}
