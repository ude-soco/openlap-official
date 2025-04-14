import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import Chart from "react-apexcharts";
import {
  Button,
  FormControl,
  FormHelperText,
  Grow,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import PaletteIcon from "@mui/icons-material/Palette";
import CloseIcon from "@mui/icons-material/Close";
import CustomizationPanel from "./customization-panel/customization-panel.jsx";

export let StateContext = createContext();

const RadarChart = ({
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
      isShowHideLabelsBackgroundAvailable: true,
      isLabelsPositionChangeable: false,
      isLabelsPositionTopAvailable: false,
      isLabelsPositionCenterAvailable: false,
      isSeriesColorChangeable: true,
      isSeriesSingleColor: false,
      isSeriesMultipleColor: true,
      isSortingOrderChangeable: false,
      isLegendTextColorAvailable: true,
      isDataLabelsColorAvailable: true,
      isDataLabelsWithBackgroundColorAvailable: true,
      isShowHideXAxisTitleAvailable: false,
      isShowHideYAxisTitleAvailable: false,
      isShowHideAxesTitleAvailable: false,
      isSortingOrderAscendingAvailable: false,
      isSortingOrderDescendingAvailable: false,
      isCategoriesFilteringAvailable: false,
    },
    options: {
      chart: {
        id: "radar",
        type: "radar",
        width: "100%",
        foreColor: darkMode ? "#ffffff" : "#000000",
        toolbar: {
          show: false,
        },
      },
      colors: [],
      title: {
        text: "",
        align: "left",
        margin: 15,
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
      xaxis: {
        name: "",
        title: {
          text: "",
          style: {
            cssClass: "x-y-axis-show-title",
          },
        },
        categories: [],
        labels: {
          show: true,
        },
      },
      yaxis: {
        title: {
          text: "",
          style: {
            cssClass: "x-y-axis-show-title",
          },
        },
        labels: {
          show: true,
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          colors: ["#000000"],
          fontWeight: 400,
        },
        background: {
          enabled: false,
          foreColor: "#ffffff",
          padding: 10,
          borderRadius: 2,
          borderWidth: 1,
          borderColor: "#ffffff",
        },
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
      tooltip: {
        enabled: true,
        followCursor: true,
        theme: darkMode ? "dark" : "light",
        onDatasetHover: {
          highlightDataSeries: true,
        },
      },
      fill: {
        opacity: 0.4,
      },
      stroke: {
        show: true,
        width: 2,
      },
      markers: {
        size: 4,
      },
    },
    axisOptions: {
      xAxisOptions: [],
      yAxisOptions: [],
      selectedXAxis: "",
      selectedYAxis: [],
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
        )?.field || ""
      : stringColumns.length > 0
      ? stringColumns[0].field
      : "";

    const updatedSelectedYAxis = state.axisOptions.selectedYAxis
      ? numberColumns.find(
          (col) => col.field === state.axisOptions.selectedYAxis
        )?.field || (numberColumns.length > 0 ? [numberColumns[0].field] : [])
      : numberColumns.length > 0
      ? [numberColumns[0].field]
      : [];

    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        chart: {
          ...prevState.options.chart,
          type: visRef.chart.code,
          foreColor: darkMode ? "#ffffff" : "#000000",
        },
        tooltip: {
          ...prevState.options.tooltip,
          theme: darkMode ? "dark" : "light",
        },
      },
      axisOptions: {
        xAxisOptions: stringColumns,
        yAxisOptions: numberColumns,
        selectedXAxis: updatedSelectedXAxis,
        selectedYAxis: updatedSelectedYAxis,
      },
    }));
  }, [dataset.columns.length]);

  useEffect(() => {
    const { selectedXAxis, selectedYAxis } = state.axisOptions;
    const xAxisColumn = dataset.columns.find(
      (col) => col.field === selectedXAxis
    );
    const yAxisColumns = dataset.columns.filter((col) =>
      selectedYAxis.includes(col.field)
    );

    if (!xAxisColumn || yAxisColumns.length === 0) return;

    // Get unique categories for X-axis
    const categories = xAxisColumn
      ? [...new Set(dataset.rows.map((row) => row[xAxisColumn.field]))]
      : [];

    // Aggregate data based on selected Y-axis and X-axis categories
    const series = selectedYAxis.map((yField) => {
      const valueColumn = dataset.columns.find((col) => col.field === yField);
      const seriesData = categories.map((category) => {
        return dataset.rows
          .filter((row) => row[xAxisColumn.field] === category)
          .reduce((acc, row) => acc + (row[valueColumn.field] || 0), 0);
      });

      return {
        name: valueColumn ? valueColumn.headerName : "Default Series",
        data: seriesData,
      };
    });

    // // Group data by unique X-axis values and sum Y-axis values
    // const groupedData = dataset.rows.reduce((acc, row) => {
    //   const xValue = row[selectedXAxis] || "Unknown";
    //   if (!acc[xValue]) acc[xValue] = {};
    //   selectedYAxis.forEach((yField) => {
    //     if (!acc[xValue][yField]) acc[xValue][yField] = 0;
    //     acc[xValue][yField] += row[yField] || 0;
    //   });
    //   return acc;
    // }, {});

    // // Prepare categories and series
    // const categories = Object.keys(groupedData);
    // const series = selectedYAxis.map((yField) => ({
    //   name:
    //     dataset.columns.find((col) => col.field === yField)?.headerName ||
    //     "Default Series",
    //   data: categories.map((category) => groupedData[category][yField]),
    // }));

    setState((prevState) => ({
      ...prevState,
      series: series,
      options: {
        ...prevState.options,
        chart: {
          ...prevState.options.chart,
          type: visRef.chart.code,
          foreColor: darkMode ? "#ffffff" : "#000000",
        },
        tooltip: {
          ...prevState.options.tooltip,
          theme: darkMode ? "dark" : "light",
        },
        xaxis: {
          ...prevState.options.xaxis,
          categories: categories,
          name: xAxisColumn ? xAxisColumn.headerName : "Default Categories",
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
    state.axisOptions.selectedXAxis,
    state.axisOptions.selectedYAxis,
    darkMode,
  ]);

  const handleXAxisChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedXAxis: event.target.value,
      },
    }));
  };

  const handleYAxisChange = (event) => {
    const { value } = event.target;
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedYAxis: typeof value === "string" ? value.split(",") : value,
      },
    }));
  };

  console.log(state.options);
  console.log(state.series);
  return (
    <>
      <Grid container spacing={2}>
        {!preview && (
          <>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="x-axis-select-label">X-Axis</InputLabel>
                <Select
                  labelId="x-axis-select-label"
                  id="x-axis-select"
                  value={state.axisOptions.selectedXAxis}
                  onChange={handleXAxisChange}
                  label="X-Axis"
                  variant="outlined"
                >
                  {state.axisOptions.xAxisOptions.map((col) => (
                    <MenuItem key={col.field} value={col.field}>
                      {col.headerName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="y-axis-select-label">Y-Axis</InputLabel>
                <Select
                  labelId="y-axis-select-label"
                  id="y-axis-select"
                  multiple
                  value={state.axisOptions.selectedYAxis}
                  onChange={handleYAxisChange}
                  label="Y-Axis"
                  variant="outlined"
                  renderValue={(selected) =>
                    selected
                      .map((value) => {
                        const column = state.axisOptions.yAxisOptions.find(
                          (col) => col.field === value
                        );
                        return column ? column.headerName : value;
                      })
                      .join(", ")
                  }
                >
                  {state.axisOptions.yAxisOptions.map((col) => (
                    <MenuItem key={col.field} value={col.field}>
                      {col.headerName}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Multi-select possible</FormHelperText>
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
                type="radar"
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
                type="radar"
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

export default RadarChart;
