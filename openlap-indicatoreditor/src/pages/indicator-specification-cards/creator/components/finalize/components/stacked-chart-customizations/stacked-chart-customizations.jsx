import { Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useEffect, useState } from "react";
import { ElementsStacked } from "./elements-stacked";
import { StylesStacked } from "./styles-stacked";
import { FilterStacked } from "./filter-stacked";

const StackedChartCustomizations = () => {
  const [value, setvalue] = useState("1");

  const handleChange = (e, newValue) => {
    setvalue(newValue);
  };

  useEffect(() => {
    return () => {
      localStorage.removeItem("checked");
      localStorage.removeItem("categories");
      localStorage.removeItem("series");
      localStorage.removeItem("sort");
    };
  }, []);

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
              <Tab label="FILTERS" value="3" />
            </TabList>
          </Box>
          <Box height="90%" sx={{ overflowY: "scroll" }}>
            <TabPanel value="1">
              <ElementsStacked />
            </TabPanel>
            <TabPanel value="2">
              <StylesStacked />
            </TabPanel>
            <TabPanel value="3">
              <FilterStacked />
            </TabPanel>
          </Box>
        </TabContext>
      </Box>
    </>
  );
};

export default StackedChartCustomizations;
