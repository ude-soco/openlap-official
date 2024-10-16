import { Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useState } from "react";
import { RadarElements } from "./radar-elements";
import { RadarStyles } from "./radar-styles";

const RadarChartCustomizations = () => {
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
              <RadarElements />
            </TabPanel>
            <TabPanel value="2">
              <RadarStyles />
            </TabPanel>
          </Box>
        </TabContext>
      </Box>
    </>
  );
};

export default RadarChartCustomizations;
