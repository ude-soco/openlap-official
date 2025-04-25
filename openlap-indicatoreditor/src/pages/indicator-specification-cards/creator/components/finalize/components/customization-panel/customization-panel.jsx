import React, { useState, useEffect, useContext } from "react";
import { Grow, Paper, Tab } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import ElementsTab from "./components/elements-tab/elements-tab.jsx";
import StylesTab from "./components/styles-tab/styles-tab.jsx";
import FiltersTab from "./components/filters-tab.jsx";
import { ISCContext } from "../../../../indicator-specification-card.jsx";

const CustomizationPanel = ({ state, setState }) => {
  const { setVisRef } = useContext(ISCContext);
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
  useEffect(() => {
    setVisRef((prevVisRef) => ({
      ...prevVisRef,
      data: {
        ...prevVisRef.data,
        series: state.series,
        options: state.options,
        axisOptions: state.axisOptions,
      },
    }));
  }, [state.series, state.options]);

  return (
    <>
      <TabContext value={tabValue}>
        <Grid container component={Paper} variant="outlined">
          <Grid size={12} sx={{ borderBottom: 1, borderColor: "divider" }}>
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
          <Grid size={12} sx={{ height: 500, overflowY: "scroll" }}>
            <TabPanel value={tabValue}>
              <Grow
                in={tabValue === tabData[0]}
                timeout={{ enter: 500, exit: 0 }}
                unmountOnExit
              >
                <div>
                  <ElementsTab state={state} setState={setState} />
                </div>
              </Grow>
              <Grow
                in={tabValue === tabData[1]}
                timeout={{ enter: 500, exit: 0 }}
                unmountOnExit
              >
                <div>
                  <StylesTab state={state} setState={setState} />
                </div>
              </Grow>
              <Grow
                in={
                  tabValue === tabData[2] &&
                  (state.configuration.isSortingOrderChangeable ||
                    state.configuration.isCategoriesFilteringAvailable)
                }
                timeout={{ enter: 500, exit: 0 }}
                unmountOnExit
              >
                <div>
                  <FiltersTab state={state} setState={setState} />
                </div>
              </Grow>
            </TabPanel>
          </Grid>
        </Grid>
      </TabContext>
    </>
  );
};

export default CustomizationPanel;
