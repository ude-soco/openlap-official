import PropTypes from "prop-types";
import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BasicContext } from "../../../../basic-indicator";
import { defaultParams } from "../../utils/visualization-data";
import ChartCustomizationControls from "./chart-customization-controls";
import {
  getMappedCategoryValues,
  getMappedCustomizationValues,
  getVisualizationDefaults,
  getVisualizationDescriptor,
} from "../../utils/visualization-descriptor";

const ChartCustomizationPanel = ({ onClose }) => {
  const params = useParams();
  const { analysis, visualization, setVisualization } = useContext(BasicContext);
  const chart = visualization.selectedType;
  const [state, setState] = useState(() => getVisualizationDefaults(chart, defaultParams,
    params.id ? { edited: false, ...visualization.params } : visualization.params));

  useEffect(() => {
    setState(getVisualizationDefaults(chart, defaultParams, visualization.params));
    // Edits are synchronized separately below; selecting a new chart seeds its
    // own defaults without carrying the previous chart's local control state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart.id]);

  useEffect(() => {
    if (state.edited) {
      const chartParams = { ...state };
      if (getVisualizationDescriptor(chart)) delete chartParams.edited;
      setVisualization((previous) => ({
        ...previous,
        params: { ...previous.params, ...chartParams },
        previewData: { displayCode: [], scriptData: {} },
      }));
      setState((previous) => ({ ...previous, edited: false }));
    }
  }, [setVisualization, state, chart]);

  return (
    <ChartCustomizationControls
      state={state}
      setState={setState}
      chartId={visualization.selectedType.id}
      chartConfiguration={visualization.selectedType.chartConfiguration || {}}
      visualizationDescriptor={getVisualizationDescriptor(chart)}
      categories={getMappedCategoryValues(chart, visualization.mapping, analysis.analyzedData)}
      series={getMappedCustomizationValues(chart, visualization.mapping, analysis.analyzedData, "series")}
      onClose={onClose}
    />
  );
};

ChartCustomizationPanel.propTypes = { onClose: PropTypes.func };

export default ChartCustomizationPanel;
