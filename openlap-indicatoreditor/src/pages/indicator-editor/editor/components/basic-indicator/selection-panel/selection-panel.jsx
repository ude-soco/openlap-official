import Dataset from "./components/dataset/dataset.jsx";
import Filters from "./components/filters/filters.jsx";
import Analysis from "./components/analysis/analysis.jsx";
import Visualization from "./components/visualization/visualization.jsx";

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
