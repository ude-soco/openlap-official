import { useContext } from "react";
import { BasicContext } from "../../../basic-indicator";
import { defaultParams } from "../utils/visualization-data";
import ChartTypeOptions from "./chart-type-options";

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
        params: { ...defaultParams },
        mapping: { mapping: [] },
        previewData: { displayCode: [], scriptData: {} },
      }))}
    />
  );
};

export default TypeSelection;
