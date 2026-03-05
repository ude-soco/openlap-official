import {
  Box,
  Button,
  Grid,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Skeleton,
  TextField,
  Stack,
  Container,
} from "@mui/material";
import { useContext, useEffect, useState } from "react";
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
import ChartPreview from "../../../components/chart-preview";
import ChartCustomizationPanel from "./components/customization/chart-customization-panel";
import CustomPaper from "../../../../../../common/components/custom-paper/custom-paper";
import CustomTooltip from "../../../../../../common/components/custom-tooltip/custom-tooltip";
import {
  requestCreateBasicIndicator,
  requestUpdateBasicIndicator,
} from "../../utils/basic-indicator-api";
import { useNavigate, useParams } from "react-router-dom";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

export default function Visualization() {
  const params = useParams();
  const { api, SESSION_INDICATOR, user } = useContext(AuthContext);
  const {
    indicator,
    dataset,
    filters,
    analysis,
    visualization,
    lockedStep,
    setVisualization,
    setIndicator,
    isCreator,
  } = useContext(BasicContext);
  const [state, setState] = useState({
    nameIndicator: {
      openDialog: false,
      loading: false,
    },
    saveMode: null, // 'update' or 'new'
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (
      visualization.inputs.length !== 0 &&
      allInputsHaveSelected(visualization.inputs) &&
      Object.keys(analysis.analyzedData).length > 0
    ) {
      handleLoadPreviewVisualization().then((previewData) => {
        if (previewData) {
          setVisualization((p) => ({
            ...p,
            previewData: {
              ...p.previewData,
              displayCode: previewData.displayCode,
              scriptData: previewData.scriptData,
            },
          }));
        }
      }).catch((error) => {
        console.error("Error loading visualization preview:", error);
      });
    }
  }, [visualization.inputs, visualization.params, visualization.selectedType.id, analysis.analyzedData]);

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

  const handleToggleNameIndicator = () => {
    setState((p) => ({ ...p, openDialog: !p.openDialog, saveMode: null }));
  };

  const handleOnChangeNameIndicator = (event) => {
    setIndicator((p) => ({ ...p, indicatorName: event.target.value }));
  };

  const handleSaveIndicator = async (saveMode = state.saveMode) => {
    setState((p) => ({
      ...p,
      nameIndicator: { ...p.nameIndicator, loading: true },
      saveMode: saveMode, // Update state with the mode being used
    }));
    
    // Ensure we have preview data before saving
    if (!visualization.previewData.displayCode || visualization.previewData.displayCode.length === 0) {
      setState((p) => ({
        ...p,
        nameIndicator: { ...p.nameIndicator, loading: false },
      }));
      return;
    }
    
    let indicatorQuery = buildIndicatorQuery(dataset, filters, analysis);
    let analysisRef = buildAnalysisRef(analysis);
    let visRef = buildVisRef(visualization);
    let configuration = JSON.stringify({
      indicator,
      dataset,
      filters,
      analysis,
      visualization,
      lockedStep,
    });
    try {
      // Determine if we should update or create new
      const shouldUpdate = params.id && saveMode === 'update';
      if (shouldUpdate) {
        // Update existing indicator
        await requestUpdateBasicIndicator(
          api,
          params.id,
          indicatorQuery,
          analysisRef,
          visRef,
          indicator,
          configuration
        );
      } else {
        // Save as new indicator (either no ID or explicitly requested)
        await requestCreateBasicIndicator(
          api,
          indicatorQuery,
          analysisRef,
          visRef,
          indicator,
          configuration
        );
      }
      setState((p) => ({
        ...p,
        nameIndicator: { ...p.nameIndicator, loading: false },
      }));
      sessionStorage.removeItem(SESSION_INDICATOR);
      navigate("/indicator");
    } catch (error) {
      setState((p) => ({
        ...p,
        nameIndicator: { ...p.nameIndicator, loading: false },
      }));
      console.error("Failed to save the indicator", error);
    }
  };

  const handleCheckDisabled = () => {
    return (
      visualization.inputs.length === 0 ||
      !allInputsHaveSelected(visualization.inputs) ||
      Object.keys(analysis.analyzedData).length === 0 ||
      !visualization.previewData.displayCode ||
      visualization.previewData.displayCode.length === 0
    );
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
        <Stack gap={2}>
          <VisualizationSummary />
          <Collapse
            in={lockedStep.visualization.openPanel}
            timeout={{ enter: 500, exit: 250 }}
            unmountOnExit
          >
            <Stack gap={4}>
              <Container maxWidth="lg">
                <LibrarySelection />
              </Container>
              {visualization.selectedLibrary.id ? (
                visualization.typeList.length > 0 ? (
                  <TypeSelection />
                ) : (
                  <LinearProgress />
                )
              ) : undefined}
              {visualization.inputs.length > 0 &&
              Object.keys(analysis.analyzedData).length > 0 ? (
                <>
                  <TypeInputSelection />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, lg: "grow", xl: 8 }}>
                      {visualization.previewData.displayCode.length !== 0 ? (
                        <ChartPreview previewData={visualization.previewData} />
                      ) : (
                        <Skeleton variant="rectangular" height={565} />
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, md: "grow" }}>
                      <ChartCustomizationPanel />
                    </Grid>
                  </Grid>
                </>
              ) : undefined}

              <Divider />
              <Container maxWidth="sm">
                <Button
                  fullWidth
                  variant="contained"
                  disabled={handleCheckDisabled()}
                  onClick={handleToggleNameIndicator}
                >
                  Save Indicator
                </Button>
              </Container>
            </Stack>
          </Collapse>
        </Stack>
        <Dialog
          fullWidth
          maxWidth="sm"
          open={!!state.openDialog}
          onClose={handleToggleNameIndicator}
        >
          <DialogTitle>
            {params.id && isCreator
              ? "Save Indicator - Choose an Option"
              : params.id && !isCreator
              ? "Save as New Indicator"
              : "Provide a name to the indicator"}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 1 }}>
              <TextField
                fullWidth
                label="Indicator name"
                value={indicator.indicatorName}
                placeholder="e.g., The most frequently access learning materials in my course"
                onChange={handleOnChangeNameIndicator}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            {/* If not in edit mode - simple save */}
            {!params.id && (
              <>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleToggleNameIndicator}
                  disabled={state.nameIndicator.loading}
                >
                  Continue editing
                </Button>
                <Button
                  loading={state.nameIndicator.loading}
                  disabled={indicator.indicatorName.length === 0}
                  loadingPosition="start"
                  loadingIndicator="Saving..."
                  fullWidth
                  variant="contained"
                  onClick={handleSaveIndicator}
                >
                  {!state.nameIndicator.loading && "Save to dashboard"}
                </Button>
              </>
            )}

            {/* If in edit mode and IS creator - show both update and save as new options */}
            {params.id && isCreator && (
              <>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleToggleNameIndicator}
                  disabled={state.nameIndicator.loading}
                >
                  Cancel
                </Button>
                <Button
                  loading={state.nameIndicator.loading && state.saveMode === 'update'}
                  disabled={indicator.indicatorName.length === 0}
                  loadingPosition="start"
                  loadingIndicator="Updating..."
                  fullWidth
                  variant="contained"
                  onClick={() => handleSaveIndicator('update')}
                >
                  {!state.nameIndicator.loading && "Update Existing"}
                </Button>
                <Button
                  loading={state.nameIndicator.loading && state.saveMode === 'new'}
                  disabled={indicator.indicatorName.length === 0}
                  loadingPosition="start"
                  loadingIndicator="Saving..."
                  fullWidth
                  variant="outlined"
                  onClick={() => handleSaveIndicator('new')}
                >
                  {!state.nameIndicator.loading && "Save as New"}
                </Button>
              </>
            )}

            {/* If in edit mode and NOT creator - only show save as new */}
            {params.id && !isCreator && (
              <>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleToggleNameIndicator}
                  disabled={state.nameIndicator.loading}
                >
                  Cancel
                </Button>
                <Button
                  loading={state.nameIndicator.loading}
                  disabled={indicator.indicatorName.length === 0}
                  loadingPosition="start"
                  loadingIndicator="Saving..."
                  fullWidth
                  variant="contained"
                  onClick={() => handleSaveIndicator('new')}
                >
                  {!state.nameIndicator.loading && "Save as New Indicator"}
                </Button>
              </>
            )}

            {indicator.indicatorName.length === 0 && (
              <CustomTooltip
                type="help"
                message={`The button is disabled because:<br/>● Indicator name is missing.`}
              />
            )}
          </DialogActions>
        </Dialog>
      </CustomPaper>
    </>
  );
}
