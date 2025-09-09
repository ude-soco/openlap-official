import Legends from "./components/legends.jsx";
import Title from "./components/title.jsx";
import Labels from "./components/labels.jsx";
import Axis from "./components/axis.jsx";
import { Stack } from "@mui/material";

const ElementsTab = ({ state, setState }) => {
  return (
    <>
      <Stack gap={2}>
        <Legends state={state} setState={setState} />
        <Axis state={state} setState={setState} />
        <Title state={state} setState={setState} />
        <Labels state={state} setState={setState} />
      </Stack>
    </>
  );
};

export default ElementsTab;
