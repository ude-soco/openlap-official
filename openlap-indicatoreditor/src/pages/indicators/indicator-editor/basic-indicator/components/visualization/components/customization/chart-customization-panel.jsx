import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Paper, Grid, Tab, Typography } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { BasicContext } from "../../../../basic-indicator";
import { ElementsBar } from "./components/elements-bar";
import { StylesBar } from "./components/styles";
import { FiltersBar } from "./components/filter";
import { defaultParams } from "../../utils/visualization-data";
import { useParams } from "react-router-dom";

const HEIGHT = "440px";

const ChartCustomizationPanel = () => {
  const params = useParams();
  const { analysis, visualization, setVisualization } =
    useContext(BasicContext);
  const [value, setValue] = useState("1");
  const [state, setState] = useState(() => {
    if (params.id) {
      return { edited: false, ...visualization.params };
    }
    return { ...defaultParams };
  });

  const handleChangeTab = (_, newTabValue) => {
    setValue(newTabValue);
  };

  useEffect(() => {
    if (state.edited) {
      setVisualization((p) => ({
        ...p,
        params: { ...p.params, ...state },
        previewData: { displayCode: [], scriptData: {} },
      }));
      setState((p) => ({ ...p, edited: false }));
    }
  }, [state.edited]);

  useEffect(() => {
    setValue("1");
  }, [visualization.selectedType.id]);

  return (
    <>
      <Typography gutterBottom>Customization panel</Typography>
      <Grid container component={Paper} variant="outlined">
        <Grid size={{ xs: 12 }}>
          <TabContext value={value}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
                onChange={handleChangeTab}
                sx={{ width: "100%" }}
              >
                <Tab label="ELEMENTS" value="1" />
                <Tab label="STYLES" value="2" />
                {(visualization.selectedType.chartConfiguration
                  .categoriesFilteringAvailable ||
                  visualization.selectedType.chartConfiguration
                    .sortingOrderChangeable) && (
                  <Tab label="FILTERS" value="3" />
                )}
              </TabList>
            </Box>
            <TabPanel value="1">
              <Box height={HEIGHT} sx={{ overflowY: "scroll", px: 1 }}>
                <ElementsBar
                  state={state}
                  setState={setState}
                  chartConfiguration={
                    visualization.selectedType.chartConfiguration
                  }
                />
              </Box>
            </TabPanel>
            <TabPanel value="2">
              <Box height={HEIGHT} sx={{ overflowY: "scroll", px: 1 }}>
                <StylesBar
                  categories={analysis.analyzedData?.item_name?.data}
                  state={state}
                  setState={setState}
                  chartConfiguration={
                    visualization.selectedType.chartConfiguration
                  }
                />
              </Box>
            </TabPanel>
            <TabPanel value="3">
              <Box height={HEIGHT} sx={{ overflowY: "scroll", px: 1 }}>
                <FiltersBar
                  categories={analysis.analyzedData?.item_name?.data}
                  state={state}
                  setState={setState}
                  chartConfiguration={
                    visualization.selectedType.chartConfiguration
                  }
                />
              </Box>
            </TabPanel>
          </TabContext>
        </Grid>
      </Grid>
    </>
  );
};

export default ChartCustomizationPanel;
