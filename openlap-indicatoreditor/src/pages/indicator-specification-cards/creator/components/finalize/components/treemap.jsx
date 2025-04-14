import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import {
  Button,
  FormControl,
  Grow,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import Chart from "react-apexcharts";
import Grid from "@mui/material/Grid2";
import PaletteIcon from "@mui/icons-material/Palette";
import CloseIcon from "@mui/icons-material/Close";
import CustomizationPanel from "./customization-panel/customization-panel.jsx";

export let StateContext = createContext();

const TreeMap = ({
  dataset,
  visRef,
  setVisRef,
  preview = false,
  customize = false,
  handleToggleCustomizePanel,
}) => {
  const { darkMode } = useContext(CustomThemeContext);
  const chartRef = useRef(null);

  const [state, setState] = useState({
    series: [],
    configuration: {
      isShowHideLegendAvailable: true,
      isLegendPositionChangeable: true,
      isLegendPositionBottomAvailable: true,
      isLegendPositionTopAvailable: true,
      isLegendPositionLeftAvailable: true,
      isLegendPositionRightAvailable: true,
      isShowHideAxesAvailable: false,
      isShowHideXAxisAvailable: false,
      isShowHideYAxisAvailable: false,
      isChartTitleAvailable: true,
      isChartSubtitleAvailable: true,
      isTitleAndSubtitlePositionChangeable: true,
      isTitleAndSubtitlePositionCenterAvailable: true,
      isTitleAndSubtitlePositionLeftAvailable: true,
      isTitleAndSubtitlePositionRightAvailable: true,
      isShowHideLabelsAvailable: true,
      isShowHideLabelsBackgroundAvailable: false,
      isLabelsPositionChangeable: false,
      isLabelsPositionTopAvailable: false,
      isLabelsPositionCenterAvailable: false,
      isSeriesColorChangeable: true,
      isSeriesSingleColor: false,
      isSeriesMultipleColor: true,
      isSortingOrderChangeable: false,
      isLegendTextColorAvailable: true,
      isDataLabelsColorAvailable: true,
      isDataLabelsWithBackgroundColorAvailable: false,
      isShowHideXAxisTitleAvailable: false,
      isShowHideYAxisTitleAvailable: false,
      isShowHideAxesTitleAvailable: false,
      isSortingOrderAscendingAvailable: false,
      isSortingOrderDescendingAvailable: false,
      isCategoriesFilteringAvailable: false,
    },
    options: {
      chart: {
        type: "treemap",
        id: "treemap",
        height: 350,
        foreColor: darkMode ? "#ffffff" : "#000000",
        toolbar: {
          show: false,
        },
      },
      title: {
        text: "",
        align: "left",
        style: {
          fontSize: 18,
          cssClass: "x-y-axis-hide-title",
        },
      },
      subtitle: {
        text: "",
        align: "left",
        margin: 15,
      },
      legend: {
        show: true,
        showForSingleSeries: true,
        position: "bottom",
        horizontalAlign: "center",
        labels: {
          colors: undefined,
          useSeriesColors: false,
        },
        onItemClick: {
          toggleDataSeries: false,
        },
      },
      colors: [],
      xaxis: {
        categories: [],
        title: {
          text: "Group By",
          style: {
            cssClass: "x-y-axis-show-title",
          },
        },
        style: {
          cssClass: "x-y-axis-show-title",
        },
        labels: {
          show: true,
        },
      },
      yaxis: {
        title: {
          text: "Counts",
          style: {
            cssClass: "x-y-axis-show-title",
          },
        },
        style: {
          cssClass: "x-y-axis-show-title",
        },
        labels: {
          show: true,
          formatter: (value) => value.toLocaleString(),
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          colors: ["#000000"],
          fontWeight: 400,
        },
        background: {
          enabled: true,
          foreColor: "#ffffff",
          padding: 10,
          borderRadius: 2,
          borderWidth: 1,
          borderColor: "#ffffff",
        },
      },
      tooltip: {
        enabled: true,
        followCursor: true,
        theme: darkMode ? "dark" : "light",
      },
    },
    axisOptions: {
      categoryOptions: [],
      xValueOptions: [],
      valueOptions: [],
      selectedCategory: "",
      selectedXValue: "",
      selectedValue: "",
    },
  });

  // * This effect is used to set the initial state of the chart when previewing
  useEffect(() => {
    if (preview) {
      setState((prevState) => ({
        ...prevState,
        series: visRef.data.series,
        options: {
          ...visRef.data.options,
          chart: {
            ...visRef.data.options.chart,
            foreColor: darkMode ? "#ffffff" : "#000000",
          },
          tooltip: {
            ...visRef.data.options.tooltip,
            theme: darkMode ? "dark" : "light",
          },
        },
        axisOptions: visRef.data.axisOptions,
      }));
    }
  }, [preview, darkMode]);

  useEffect(() => {
    const stringColumns = dataset.columns.filter(
      (col) => col.type === "string"
    );
    const numberColumns = dataset.columns.filter(
      (col) => col.type === "number"
    );

    const updatedSelectedXAxis = state.axisOptions.selectedXAxis
      ? stringColumns.find(
          (col) => col.field === state.axisOptions.selectedXAxis
        )?.field || (stringColumns.length > 0 ? stringColumns[0].field : "")
      : stringColumns.length > 0
      ? stringColumns[0].field
      : "";

    const updatedSelectedValue = state.axisOptions.selectedValue
      ? numberColumns.find(
          (col) => col.field === state.axisOptions.selectedValue
        )?.field ||
        (numberColumns.length > 0
          ? numberColumns[1]?.field
          : numberColumns[0]?.field || "")
      : numberColumns.length > 0
      ? numberColumns[0].field
      : "";

    const updatedSelectedCategory = state.axisOptions.selectedCategory
      ? stringColumns.find(
          (col) => col.field === state.axisOptions.selectedCategory
        )?.field || (stringColumns.length > 0 ? stringColumns[0].field : "")
      : stringColumns.length > 0
      ? stringColumns[1]?.field
      : stringColumns[0]?.field || "";

    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        categoryOptions: stringColumns,
        xValueOptions: stringColumns,
        valueOptions: numberColumns,
        selectedCategory: updatedSelectedCategory,
        selectedXValue: updatedSelectedXAxis,
        selectedValue: updatedSelectedValue,
      },
    }));
  }, [dataset.columns.length]);

  console.log(state.series);
  useEffect(() => {
    const { selectedCategory, selectedXValue, selectedValue } =
      state.axisOptions;

    const categoryColumn = dataset.columns.find(
      (col) => col.field === selectedCategory
    );
    const valueColumn = dataset.columns.find(
      (col) => col.field === selectedValue
    );
    const xAxisColumn = dataset.columns.find(
      (col) => col.field === selectedXValue
    );

    if (!categoryColumn || !valueColumn || !xAxisColumn) return;

    // * Aggregating data for TreeMap
    const aggregateData = dataset.rows.reduce((acc, row) => {
      const category = row[selectedCategory];
      const xValue = row[selectedXValue];
      const value = row[selectedValue] || 0;

      if (!acc[category]) {
        acc[category] = [];
      }

      // * Finding if xValue already exists
      const existing = acc[category].find((item) => item.x === xValue);
      if (existing) {
        existing.y += value; // Sum the values
      } else {
        acc[category].push({
          x: xValue,
          y: value,
        });
      }

      return acc;
    }, {});

    // * Converting aggregate data to the format required by TreeMap
    const series = Object.entries(aggregateData).map(([category, data]) => ({
      name: category,
      data: data,
    }));

    setState((prevState) => ({
      ...prevState,
      series: series,
      options: {
        ...prevState.options,
        title: {
          align: "left",
          text: `TreeMap of ${categoryColumn?.headerName} vs ${xAxisColumn?.headerName} vs ${valueColumn?.headerName}`,
        },
      },
    }));
    setVisRef((prevVisRef) => ({
      ...prevVisRef,
      data: {
        ...prevVisRef.data,
        series: state.series,
        options: state.options,
        axisOptions: state.axisOptions,
      },
    }));
  }, [
    dataset,
    state.axisOptions.selectedCategory,
    state.axisOptions.selectedXValue,
    state.axisOptions.selectedValue,
    darkMode,
  ]);

  const handleCategoryChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedCategory: event.target.value,
      },
    }));
  };

  const handleXValueChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedXValue: event.target.value,
      },
    }));
  };

  const handleValueChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedValue: event.target.value,
      },
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        {!preview && (
          <>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="category-select-label">Category</InputLabel>
                <Select
                  labelId="category-select-label"
                  id="category-select"
                  value={state.axisOptions.selectedCategory}
                  onChange={handleCategoryChange}
                  label="Category"
                  variant="outlined"
                >
                  {state.axisOptions.categoryOptions.map((col) => (
                    <MenuItem key={col.field} value={col.field}>
                      {col.headerName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="x-value-select-label">X-Value</InputLabel>
                <Select
                  labelId="x-value-select-label"
                  id="x-value-select"
                  value={state.axisOptions.selectedXValue}
                  onChange={handleXValueChange}
                  label="X-Value"
                  variant="outlined"
                >
                  {state.axisOptions.xValueOptions.map((col) => (
                    <MenuItem key={col.field} value={col.field}>
                      {col.headerName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="value-select-label">Value</InputLabel>
                <Select
                  labelId="value-select-label"
                  id="value-select"
                  value={state.axisOptions.selectedValue}
                  onChange={handleValueChange}
                  label="Value"
                  variant="outlined"
                >
                  {state.axisOptions.valueOptions.map((col) => (
                    <MenuItem key={col.field} value={col.field}>
                      {col.headerName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {!customize && (
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={2} justifyContent="flex-end">
                  <Button
                    startIcon={<PaletteIcon />}
                    variant="contained"
                    onClick={handleToggleCustomizePanel}
                  >
                    Customize
                  </Button>
                </Grid>
              </Grid>
            )}
          </>
        )}

        <Grow in={!customize} timeout={{ enter: 500, exit: 0 }} unmountOnExit>
          <Grid size={{ xs: 12 }} sx={{ minHeight: 600 }}>
            {state.series.length > 0 ? (
              <Chart
                ref={chartRef}
                options={state.options}
                series={state.series}
                type="treemap"
                height="100%"
              />
            ) : (
              <Skeleton />
            )}
          </Grid>
        </Grow>

        <Grow in={customize} timeout={{ enter: 500, exit: 0 }} unmountOnExit>
          <Grid size={{ xs: 12, md: 8 }} sx={{ minHeight: 600 }}>
            {state.series.length > 0 ? (
              <Chart
                ref={chartRef}
                options={state.options}
                series={state.series}
                type="treemap"
                height="100%"
              />
            ) : (
              <Skeleton />
            )}
          </Grid>
        </Grow>
        <Grow in={customize} timeout={{ enter: 500, exit: 0 }} unmountOnExit>
          <Grid size={{ xs: 12, md: 4 }} sx={{ minHeight: 600 }}>
            <Grid
              container
              spacing={2}
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography>Customization panel</Typography>
              <Tooltip title="Close">
                <IconButton onClick={handleToggleCustomizePanel}>
                  <CloseIcon color="primary" />
                </IconButton>
              </Tooltip>
            </Grid>
            <CustomizationPanel state={state} setState={setState} />
          </Grid>
        </Grow>
      </Grid>
    </>
  );
};

export default TreeMap;
