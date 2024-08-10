import Dataset from "./components/dataset/dataset";
import Filters from "./components/filters/filters";
import Analysis from "./components/analysis/analysis";
import Visualization from "./components/visualization/visualization";

const SelectionPanel = () => {
  return (
    <>
      <Dataset />
      <Filters />
      <Analysis />
      <Visualization />
    </>
  );
};

export default SelectionPanel;
