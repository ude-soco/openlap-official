import { TabContext, TabList, TabPanel } from "@mui/lab";
import PropTypes from "prop-types";
import {
  Box,
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

const HEIGHT = "440px";

const ChartCustomizationControls = ({
  state,
  setState,
  chartConfiguration,
  categories,
  chartId,
  onClose,
}) => {
  const [value, setValue] = useState("1");
  const canFilter = chartConfiguration.categoriesFilteringAvailable || chartConfiguration.sortingOrderChangeable;
  useEffect(() => setValue("1"), [chartId]);
  useEffect(() => {
    if (!canFilter && value === "3") setValue("1");
  }, [canFilter, value]);
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
      <Grid container component={Paper} variant="outlined">
        <Grid size={{ xs: 12 }}>
          <TabContext value={value}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList
                aria-label="Chart customization"
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
                onChange={handleChangeTab}
                sx={{ width: "100%" }}
              >
                <Tab label="ELEMENTS" value="1" />
                <Tab label="STYLES" value="2" />
                {canFilter && (
                  <Tab label="FILTERS" value="3" />
                )}
              </TabList>
            </Box>
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
          </TabContext>
        </Grid>
      </Grid>
    </>
  );
};

ChartCustomizationControls.propTypes = {
  state: PropTypes.object.isRequired,
  setState: PropTypes.func.isRequired,
  chartConfiguration: PropTypes.object.isRequired,
  categories: PropTypes.array,
  chartId: PropTypes.string,
  onClose: PropTypes.func,
};

export default ChartCustomizationControls;
