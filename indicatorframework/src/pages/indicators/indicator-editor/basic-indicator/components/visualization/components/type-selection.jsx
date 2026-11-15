import { useContext } from "react";
import { BasicContext } from "../../../basic-indicator";
import { defaultParams } from "../utils/visualization-data";
import ChartTypeOptions from "./chart-type-options";
import { getVisualizationDefaults } from "../utils/visualization-descriptor";

const TypeSelection = () => {
  const { analysis, visualization, setVisualization } = useContext(BasicContext);
  return (
    <ChartTypeOptions
      types={visualization.typeList}
      analyzedData={analysis.analyzedData}
      selectedTypeId={visualization.selectedType.id}
      onSelect={(selectedType) => setVisualization((previous) => ({
        ...previous,
        selectedType,
        inputs: [...selectedType.chartInputs],
        params: getVisualizationDefaults(selectedType, defaultParams),
        mapping: { mapping: [] },
        previewData: { displayCode: [], scriptData: {} },
      }))}
    />
  );
};

export default TypeSelection;
