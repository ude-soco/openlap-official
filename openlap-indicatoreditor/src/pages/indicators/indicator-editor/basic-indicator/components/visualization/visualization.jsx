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
  const { api, SESSION_INDICATOR } = useContext(AuthContext);
  const {
    indicator,
    dataset,
    filters,
    analysis,
    visualization,
    lockedStep,
    setVisualization,
    setIndicator,
  } = useContext(BasicContext);
  const [state, setState] = useState({
    nameIndicator: {
      openDialog: false,
      loading: false,
    },
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (
      visualization.inputs.length !== 0 &&
      allInputsHaveSelected(visualization.inputs) &&
      Object.keys(analysis.analyzedData).length > 0
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

  const handleToggleNameIndicator = () => {
    setState((p) => ({ ...p, openDialog: !p.openDialog }));
  };

  const handleOnChangeNameIndicator = (event) => {
    setIndicator((p) => ({ ...p, indicatorName: event.target.value }));
  };

  const handleSaveIndicator = async () => {
    setState((p) => ({
      ...p,
      nameIndicator: { ...p.nameIndicator, loading: true },
    }));
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
      if (params.id) {
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
      Object.keys(analysis.analyzedData).length === 0
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
          <DialogTitle>Provide a name to the indicator</DialogTitle>
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
              loadingIndicator={params.id ? "Updating..." : "Saving..."}
              fullWidth
              variant="contained"
              onClick={handleSaveIndicator}
            >
              {!state.nameIndicator.loading &&
                (params.id
                  ? "Update & Save to Dashboard"
                  : "Save to dashboard")}
            </Button>
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
