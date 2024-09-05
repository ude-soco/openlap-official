import { Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useEffect, useState } from "react";
import { ElementsBar } from "./elements-bar";
import { StylesBar } from "./styles-bar";
import { FiltersBar } from "./filters-bar";

const BarChartCustomization = () => {
  const tabValue = localStorage.getItem("tabValue");
  const [value, setvalue] = useState(tabValue ? tabValue : "1");

  useEffect(() => {
    const tabValue = localStorage.getItem("tabValue");
    if (tabValue) {
      setvalue(tabValue);
    }
  }, []);

  const handleChange = (e, newValue) => {
    localStorage.setItem("tabValue", newValue);
    setvalue(newValue);
  };

  return (
    <>
      <Box height="600px" sx={{ border: "1px solid grey", borderRadius: 2 }}>
        <TabContext value={value}>
          <Box sx={{ borderBottom: 1, borderColor: "divider", width: "100%" }}>
            <TabList
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              onChange={handleChange}
              sx={{ width: "100%" }} // Set width to 100%
            >
              <Tab label="ELENENTS" value="1" />
              <Tab label="STYLES" value="2" />
              <Tab label="FILTERS" value="3" />
            </TabList>
          </Box>
          <Box height="90%" sx={{ overflowY: "scroll" }}>
            <TabPanel value="1">
              <ElementsBar />
            </TabPanel>
            <TabPanel value="2">
              <StylesBar />
            </TabPanel>
            <TabPanel value="3">
              <FiltersBar />
            </TabPanel>
          </Box>
        </TabContext>
      </Box>
    </>
  );
};

export default BarChartCustomization;
