import { TabContext, TabList, TabPanel } from "@mui/lab";
import PropTypes from "prop-types";
import {
  Box,
  Alert,
  IconButton,
  Paper,
  Grid,
  Stack,
  Tab,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";
import { ElementsBar } from "./components/elements-bar";
import { StylesBar } from "./components/styles";
import { FiltersBar } from "./components/filter";
import DescriptorFields from "./components/descriptor-fields";
import { getCustomizationFields } from "../../utils/visualization-descriptor";

const HEIGHT = "440px";

const ChartCustomizationControls = ({
  state,
  setState,
  chartConfiguration,
  categories,
  series,
  chartId,
  onClose,
  visualizationDescriptor,
}) => {
  const [value, setValue] = useState("1");
  const descriptor = visualizationDescriptor?.schemaVersion === 1 ? visualizationDescriptor : null;
  const canFilter = chartConfiguration.categoriesFilteringAvailable || chartConfiguration.sortingOrderChangeable;
  const tabs = [
    { value: "1", group: "elements", label: "ELEMENTS" },
    { value: "2", group: "styles", label: "STYLES" },
    { value: "3", group: "filters", label: "FILTERS" },
  ].filter((tab) => descriptor
    ? getCustomizationFields(descriptor).some((field) => field.group === tab.group)
    : tab.value !== "3" || canFilter);
  const activeValue = tabs.some((tab) => tab.value === value) ? value : tabs[0]?.value || "1";
  useEffect(() => setValue("1"), [chartId]);
  const handleChangeTab = (_, newTabValue) => setValue(newTabValue);
  return (
    <>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          Customization panel
        </Typography>
        {onClose && (
          <Tooltip title="Close">
            <IconButton
              size="small"
              aria-label="Close customization"
              onClick={onClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {descriptor && !tabs.length ? (
        <Alert severity="info">This chart has no supported customization options.</Alert>
      ) : (
      <Grid container component={Paper} variant="outlined">
        <Grid size={{ xs: 12 }}>
          <TabContext value={activeValue}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList
                aria-label="Chart customization"
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
                onChange={handleChangeTab}
                sx={{ width: "100%" }}
              >
                {tabs.map((tab) => <Tab key={tab.value} label={tab.label} value={tab.value} />)}
              </TabList>
            </Box>
            {descriptor ? tabs.map((tab) => (
              <TabPanel key={tab.value} value={tab.value}>
                <Box sx={{ height: HEIGHT, overflowY: "auto", px: 1 }}>
                  <DescriptorFields descriptor={descriptor} group={tab.group} state={state} setState={setState}
                    categories={categories} series={series} />
                </Box>
              </TabPanel>
            )) : <>
            <TabPanel value="1">
              <Box sx={{ height: HEIGHT, overflowY: "scroll", px: 1 }}>
                <ElementsBar
                  state={state}
                  setState={setState}
                  chartConfiguration={chartConfiguration}
                />
              </Box>
            </TabPanel>
            <TabPanel value="2">
              <Box sx={{ height: HEIGHT, overflowY: "scroll", px: 1 }}>
                <StylesBar
                  categories={categories}
                  state={state}
                  setState={setState}
                  chartConfiguration={chartConfiguration}
                />
              </Box>
            </TabPanel>
            <TabPanel value="3">
              <Box sx={{ height: HEIGHT, overflowY: "scroll", px: 1 }}>
                <FiltersBar
                  categories={categories}
                  state={state}
                  setState={setState}
                  chartConfiguration={chartConfiguration}
                />
              </Box>
            </TabPanel>
            </>}
          </TabContext>
        </Grid>
      </Grid>
      )}
    </>
  );
};

ChartCustomizationControls.propTypes = {
  state: PropTypes.object.isRequired,
  setState: PropTypes.func.isRequired,
  chartConfiguration: PropTypes.object.isRequired,
  categories: PropTypes.array,
  series: PropTypes.array,
  chartId: PropTypes.string,
  onClose: PropTypes.func,
  visualizationDescriptor: PropTypes.object,
};

export default ChartCustomizationControls;
