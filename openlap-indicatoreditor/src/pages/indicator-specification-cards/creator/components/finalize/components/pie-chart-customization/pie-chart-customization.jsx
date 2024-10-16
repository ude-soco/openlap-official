import { Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useEffect, useState } from "react";
import { ElementsPie } from "./elements-pie";
import { StylesPie } from "./styles-pie";

export const PieChartCustomization = () => {
  const tabValue = localStorage.getItem("tabValue");
  const [value, setvalue] = useState("1");

  const handleChange = (e, newValue) => {
    setvalue(newValue);
  };

  return (
    <>
      <Box height="600px" sx={{ border: "1px solid #f0f0f0", borderRadius: 2 }}>
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
              {/* <Tab label="FILTERS" value="3" /> */}
            </TabList>
          </Box>
          <Box height="90%" sx={{ overflowY: "scroll" }}>
            <TabPanel value="1">
              <ElementsPie />
            </TabPanel>
            <TabPanel value="2">
              <StylesPie />
            </TabPanel>
          </Box>
        </TabContext>
      </Box>
    </>
  );
};
