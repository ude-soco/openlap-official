import Dataset from "./components/dataset/dataset.jsx";
import Filters from "./components/filters/filters.jsx";
import Analysis from "../../components/analysis/analysis.jsx";
import Visualization from "../../components/visualization/visualization.jsx";
import { requestBasicIndicatorPreview } from "../../components/visualization/utils/visualization-api.js";
import { useContext } from "react";
import { BasicIndicatorContext } from "../basic-indicator.jsx";
import { AuthContext } from "../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { fetchAnalyzedData } from "../../components/analysis/utils/analytics-api.js";
import Grid from "@mui/material/Grid2";
import PreviewPanel from "../../components/preview-panel/preview-panel.jsx";

const SelectionPanel = () => {
  const { api } = useContext(AuthContext);
  const {
    lockedStep,
    indicator,
    indicatorQuery,
    analysisRef,
    visRef,
    loading,
    generate,
    chartConfiguration,
    setLockedStep,
    setAnalysisRef,
    setVisRef,
    setIndicator,
    setGenerate,
    setLoading,
    setChartConfiguration,
    handleSaveNewBasicIndicator,
  } = useContext(BasicIndicatorContext);

  const loadPreviewVisualization = async (
    api,
    indicatorQuery,
    analysisRef,
    visRef
  ) => {
    try {
      return await requestBasicIndicatorPreview(
        api,
        indicatorQuery,
        analysisRef,
        visRef
      );
    } catch (error) {
      console.log("Error analyzing the data");
      throw error;
    }
  };

  const loadAnalyzedData = async (api, indicatorQuery, analysisRef) => {
    try {
      return await fetchAnalyzedData(api, indicatorQuery, analysisRef);
    } catch (error) {
      throw error;
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Dataset />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Filters />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Analysis
            lockedStep={lockedStep}
            setLockedStep={setLockedStep}
            indicator={indicator}
            analysisRef={analysisRef}
            setAnalysisRef={setAnalysisRef}
            setIndicator={setIndicator}
            setGenerate={setGenerate}
            setVisRef={setVisRef}
            loadAnalyzedData={() =>
              loadAnalyzedData(api, indicatorQuery, analysisRef)
            }
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Visualization
            lockedStep={lockedStep}
            setLockedStep={setLockedStep}
            visRef={visRef}
            setVisRef={setVisRef}
            generate={generate}
            analyzedData={analysisRef.analyzedData}
            setIndicator={setIndicator}
            setGenerate={setGenerate}
            setChartConfiguration={setChartConfiguration}
            handlePreview={() =>
              loadPreviewVisualization(api, indicatorQuery, analysisRef, visRef)
            }
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <PreviewPanel
            lockedStep={lockedStep}
            indicator={indicator}
            loading={loading}
            indicatorQuery={indicatorQuery}
            chartConfiguration={chartConfiguration}
            visRef={visRef}
            analysisRef={analysisRef}
            setVisRef={setVisRef}
            setIndicator={setIndicator}
            setLockedStep={setLockedStep}
            setLoading={setLoading}
            handleSaveIndicator={handleSaveNewBasicIndicator}
          />
        </Grid>
      </Grid>
    </>
  );
};

export default SelectionPanel;
