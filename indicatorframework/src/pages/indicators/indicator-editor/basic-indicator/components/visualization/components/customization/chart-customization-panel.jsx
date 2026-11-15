import PropTypes from "prop-types";
import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BasicContext } from "../../../../basic-indicator";
import { defaultParams } from "../../utils/visualization-data";
import ChartCustomizationControls from "./chart-customization-controls";

const ChartCustomizationPanel = ({ onClose }) => {
  const params = useParams();
  const { analysis, visualization, setVisualization } = useContext(BasicContext);
  const [state, setState] = useState(() => params.id
    ? { edited: false, ...visualization.params }
    : { ...defaultParams });

  useEffect(() => {
    if (state.edited) {
      setVisualization((previous) => ({
        ...previous,
        params: { ...previous.params, ...state },
        previewData: { displayCode: [], scriptData: {} },
      }));
      setState((previous) => ({ ...previous, edited: false }));
    }
  }, [setVisualization, state]);

  return (
    <ChartCustomizationControls
      state={state}
      setState={setState}
      chartId={visualization.selectedType.id}
      chartConfiguration={visualization.selectedType.chartConfiguration}
      categories={analysis.analyzedData?.item_name?.data}
      onClose={onClose}
    />
  );
};

ChartCustomizationPanel.propTypes = { onClose: PropTypes.func };

export default ChartCustomizationPanel;
