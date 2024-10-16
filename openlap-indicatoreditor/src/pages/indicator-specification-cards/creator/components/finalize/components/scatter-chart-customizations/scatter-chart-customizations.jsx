import { Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useState } from "react";
import ElementsScatter from "./elements-scatter";
import StylesScatter from "./styles-scatter";

const ScatterChartCustomizations = () => {
  const [value, setvalue] = useState("1");

  const handleChange = (e, newValue) => {
    setvalue(newValue);
  };

  return (
    <>
      <Box
        height="600px"
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
      >
        <TabContext value={value}>
          <Box sx={{ borderBottom: 1, borderColor: "divider", width: "100%" }}>
            <TabList
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              onChange={handleChange}
              sx={{ width: "100%" }} // Set width to 100%
            >
              <Tab label="ELEMENTS" value="1" />
              <Tab label="STYLES" value="2" />
            </TabList>
          </Box>
          <Box height="90%" sx={{ overflowY: "scroll" }}>
            <TabPanel value="1">
              <ElementsScatter />
            </TabPanel>
            <TabPanel value="2">
              <StylesScatter />
            </TabPanel>
          </Box>
        </TabContext>
      </Box>
    </>
  );
};

export default ScatterChartCustomizations;
