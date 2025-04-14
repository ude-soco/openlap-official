import React, { useState } from "react";
import { Paper, Tab, Typography } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import ElementsTab from "./components/elements-tab/elements-tab.jsx";
import StylesTab from "./components/styles-tab/styles-tab.jsx";
import FiltersTab from "./components/filters-tab.jsx";
import Grid from "@mui/material/Grid2";

const CustomizationPanel = ({ state, setState, chartRef }) => {
  const tabData =
    (state.configuration.isSortingOrderChangeable ||
      state.configuration.isCategoriesFilteringAvailable) &&
    state.options.chart.id !== "line"
      ? ["elements", "style", "filters"]
      : ["elements", "style"];
  const [tabValue, setTabValue] = useState(tabData[0]);

  const handleChangeTab = (event, newValue) => {
    setTabValue(() => tabData.find((item) => item === newValue));
  };
  return (
    <>
      <TabContext value={tabValue}>
        <Grid container component={Paper} variant="outlined">
          <Grid size={12}>
            <TabList
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              onChange={handleChangeTab}
            >
              {tabData.map((item, index) => (
                <Tab key={index} label={item} value={item} />
              ))}
            </TabList>
          </Grid>
          <Grid size={12} sx={{ height: 480, overflowY: "scroll" }}>
            <TabPanel value={tabValue}>
              {tabValue === tabData[0] && (
                <ElementsTab state={state} setState={setState} />
              )}
              {tabValue === tabData[1] && (
                <StylesTab state={state} setState={setState} />
              )}
              {tabValue === tabData[2] &&
                (state.configuration.isSortingOrderChangeable ||
                  state.configuration.isCategoriesFilteringAvailable) && (
                  <FiltersTab state={state} setState={setState} />
                )}
            </TabPanel>
          </Grid>
        </Grid>
      </TabContext>
    </>
  );
};

export default CustomizationPanel;
