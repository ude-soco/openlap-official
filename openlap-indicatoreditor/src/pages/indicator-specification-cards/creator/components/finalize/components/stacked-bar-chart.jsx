import { useContext, useEffect, useRef, useState } from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import {
  Button,
  FormControl,
  Grow,
  Grid,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import Chart from "react-apexcharts";
import PaletteIcon from "@mui/icons-material/Palette";
import CloseIcon from "@mui/icons-material/Close";
import CustomizationPanel from "./customization-panel/customization-panel.jsx";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { DataTypes } from "../../../utils/data/config.js";
import ChartAxisDropdownFeedback from "./chart-axis-dropdown-feedback.jsx";

const StackedBarChart = ({ customize = false, handleToggleCustomizePanel }) => {
  const { darkMode } = useContext(CustomThemeContext);
  const { visRef, setVisRef, dataset } = useContext(ISCContext);
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
      isShowHideAxesAvailable: true,
      isShowHideXAxisAvailable: true,
      isShowHideYAxisAvailable: true,
      isChartTitleAvailable: true,
      isChartSubtitleAvailable: true,
      isTitleAndSubtitlePositionChangeable: true,
      isTitleAndSubtitlePositionCenterAvailable: true,
      isTitleAndSubtitlePositionLeftAvailable: true,
      isTitleAndSubtitlePositionRightAvailable: true,
      isShowHideLabelsAvailable: true,
      isShowHideLabelsBackgroundAvailable: true,
      isLabelsPositionChangeable: true,
      isLabelsPositionTopAvailable: true,
      isLabelsPositionCenterAvailable: true,
      isSeriesColorChangeable: true,
      isSeriesSingleColor: false,
      isSeriesMultipleColor: true,
      isSortingOrderChangeable: false,
      isLegendTextColorAvailable: true,
      isDataLabelsColorAvailable: true,
      isDataLabelsWithBackgroundColorAvailable: true,
      isShowHideXAxisTitleAvailable: true,
      isShowHideYAxisTitleAvailable: true,
      isShowHideAxesTitleAvailable: true,
      isSortingOrderAscendingAvailable: false,
      isSortingOrderDescendingAvailable: false,
      isCategoriesFilteringAvailable: true,
    },
    options: visRef.edit
      ? visRef.data.options
      : {
          chart: {
            type: visRef.chart.code,
            id: visRef.chart.code,
            stacked: true,
            width: "100%",
            foreColor: darkMode ? "#ffffff" : "#000000",
            toolbar: {
              show: false,
              autoSelected: "zoom",
            },
          },
          labels: [],
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
          plotOptions: {
            bar: {
              borderRadius: 4,
              horizontal: false,
              dataLabels: {
                position: "top",
              },
            },
          },
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
          tooltip: {
            enabled: true,
            followCursor: true,
            theme: darkMode ? "dark" : "light",
            onDatasetHover: {
              highlightDataSeries: true,
            },
          },
        },
    axisOptions: {
      xAxisOptions: [],
      yAxisOptions: [],
      barValueOptions: [],
      selectedXAxis: "",
      selectedBarValue: "",
      selectedYAxis: "",
      xAxisType: DataTypes.categorical,
      barValueType: DataTypes.categorical,
      yAxisType: DataTypes.numerical,
    },
  });

  // * This effect is used to update the chart when the dark mode changes.
  useEffect(() => {
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        chart: {
          ...p.options.chart,
          foreColor: darkMode ? "#ffffff" : "#000000",
        },
        tooltip: { ...p.options.tooltip, theme: darkMode ? "dark" : "light" },
      },
    }));
  }, [darkMode]);

  useEffect(() => {
    const stringColumns = dataset.columns.filter(
      (col) => col.type === "string"
    );
    const numberColumns = dataset.columns.filter(
      (col) => col.type === "number"
    );
    setState((p) => ({
      ...p,
      axisOptions: {
        ...p.axisOptions,
        xAxisOptions: stringColumns,
        yAxisOptions: numberColumns,
        barValueOptions: stringColumns,
      },
    }));
    setVisRef((p) => ({
      ...p,
      data: {
        ...p.data,
        axisOptions: {
          ...p.data.axisOptions,
          xAxisOptions: stringColumns,
          barValueOptions: stringColumns,
          yAxisOptions: numberColumns,
        },
      },
      edit: false,
    }));
  }, [dataset]);

  // * Executes only when dataset changes.
  // * This effect is used to populate the xAxis, yAxis, and groupBy options.
  // * If new dataset or new column is provided, it will set the xAxis and yAxis options based on the dataset columns.
  useEffect(() => {
    const selectedXAxis =
      visRef.data.axisOptions.selectedXAxis || state.axisOptions.selectedXAxis;
    const selectedYAxis =
      visRef.data.axisOptions.selectedYAxis || state.axisOptions.selectedYAxis;
    const selectedBarValue =
      visRef.data.axisOptions.selectedBarValue ||
      state.axisOptions.selectedBarValue;
    const stringColumns =
      visRef.data.axisOptions.xAxisOptions || state.axisOptions.xAxisOptions;
    const numberColumns =
      visRef.data.axisOptions.yAxisOptions || state.axisOptions.yAxisOptions;

    let updatedSelectedXAxis = "";
    if (visRef.edit && selectedXAxis.length !== 0)
      updatedSelectedXAxis = selectedXAxis;
    else if (selectedXAxis.length !== 0)
      updatedSelectedXAxis =
        stringColumns.find((col) => col.field === selectedXAxis)?.field ||
        (stringColumns.length > 0 ? stringColumns[0].field : "");
    else
      updatedSelectedXAxis =
        stringColumns.length > 0 ? stringColumns[0].field : "";

    let updatedSelectedYAxis = "";
    if (visRef.edit && selectedYAxis.length !== 0)
      updatedSelectedYAxis = selectedYAxis;
    else if (selectedYAxis.length !== 0)
      updatedSelectedYAxis =
        numberColumns.find((col) => col.field === selectedYAxis)?.field ||
        (numberColumns.length > 0
          ? numberColumns[1]?.field || ""
          : numberColumns[0]?.field || "");
    else
      updatedSelectedYAxis =
        numberColumns.length > 0 ? numberColumns[0].field : "";

    let updatedSelectedBarValue = "";
    if (visRef.edit && selectedBarValue.length !== 0)
      updatedSelectedBarValue = selectedBarValue;
    else if (selectedBarValue.length !== 0)
      updatedSelectedBarValue =
        stringColumns.find((col) => col.field === selectedBarValue)?.field ||
        (stringColumns.length > 0 ? stringColumns[0]?.field : "");
    else
      updatedSelectedBarValue =
        stringColumns.length > 0
          ? stringColumns[1]?.field || ""
          : stringColumns[0]?.field || "";

    setState((p) => ({
      ...p,
      axisOptions: {
        ...p.axisOptions,
        selectedXAxis: updatedSelectedXAxis,
        selectedBarValue: updatedSelectedBarValue,
        selectedYAxis: updatedSelectedYAxis,
      },
    }));
  }, [
    visRef.data.axisOptions.xAxisOptions,
    visRef.data.axisOptions.yAxisOptions,
    visRef.data.axisOptions.barValueOptions,
  ]);

  useEffect(() => {
    const { selectedXAxis, selectedBarValue, selectedYAxis } =
      state.axisOptions;
    const xAxisColumn = dataset.columns.find(
      (col) => col.field === selectedXAxis
    );
    const yAxisColumn = dataset.columns.find(
      (col) => col.field === selectedYAxis
    );
    const barValueColumn = dataset.columns.find(
      (col) => col.field === selectedBarValue
    );
    if (!xAxisColumn || !yAxisColumn || !barValueColumn) return;

    // * Group and sum values by xAxis
    const aggregatedData = dataset.rows.reduce((acc, row) => {
      const category = row[selectedXAxis];
      const value = row[selectedYAxis] || 0;
      if (!acc[category]) acc[category] = { name: category, data: {} };
      const barLabel = row[selectedBarValue] || "Unknown";
      if (!acc[category].data[barLabel]) {
        acc[category].data[barLabel] = 0;
      }
      acc[category].data[barLabel] += value;
      return acc;
    }, {});

    const categories = Object.keys(aggregatedData);
    const barLabels = Array.from(
      new Set(dataset.rows.map((row) => row[selectedBarValue] || "Unknown"))
    );

    const series = barLabels.map((barLabel) => ({
      name: barLabel,
      data: categories.map(
        (category) => aggregatedData[category].data[barLabel] || 0
      ),
    }));

    setState((p) => {
      let tempState = {
        ...p,
        series: series,
        options: {
          ...p.options,
          xaxis: {
            ...p.options.xaxis,
            categories: categories,
            title: {
              style: {
                cssClass: "x-y-axis-show-title",
              },
              text:
                dataset.columns.find((col) => col.field === selectedXAxis)
                  ?.headerName || "Group By",
            },
          },
          yaxis: {
            ...p.options.yaxis,
            title: {
              style: {
                cssClass: "x-y-axis-show-title",
              },
              text:
                dataset.columns.find((col) => col.field === selectedYAxis)
                  ?.headerName || "Counts",
            },
          },
          plotOptions: {
            ...p.options.plotOptions,
            bar: {
              ...p.options.plotOptions.bar,
              stacked: true,
            },
          },
        },
      };
      setVisRef((p) => ({
        ...p,
        data: {
          ...p.data,
          series: tempState.series,
          options: tempState.options,
          axisOptions: {
            ...p.data.axisOptions,
            selectedXAxis: state.axisOptions.selectedXAxis,
            selectedBarValue: state.axisOptions.selectedBarValue,
            selectedYAxis: state.axisOptions.selectedYAxis,
          },
        },
      }));
      return tempState;
    });
  }, [
    dataset,
    state.axisOptions.selectedXAxis,
    state.axisOptions.selectedYAxis,
    state.axisOptions.selectedBarValue,
  ]);

  useEffect(() => {
    setVisRef((p) => ({
      ...p,
      data: {
        ...p.data,
        series: state.series,
        options: state.options,
        axisOptions: state.axisOptions,
      },
    }));
  }, [state.series, state.options, state.axisOptions]);

  const handleXAxisChange = (event) => {
    setState((p) => ({
      ...p,
      axisOptions: { ...p.axisOptions, selectedXAxis: event.target.value },
    }));
  };

  const handleBarValueChange = (event) => {
    setState((p) => ({
      ...p,
      axisOptions: { ...p.axisOptions, selectedBarValue: event.target.value },
    }));
  };

  const handleYAxisChange = (event) => {
    setState((p) => ({
      ...p,
      axisOptions: { ...p.axisOptions, selectedYAxis: event.target.value },
    }));
  };

  console.log(state.axisOptions.selectedBarValue);

  return (
    <>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl
            fullWidth
            error={state.axisOptions.selectedXAxis.length === 0}
          >
            <InputLabel id="x-axis-select-label">X-Axis: Group By</InputLabel>
            <Select
              labelId="x-axis-select-label"
              id="x-axis-select"
              value={state.axisOptions.selectedXAxis}
              onChange={handleXAxisChange}
              label="X-Axis: Group By"
              variant="outlined"
            >
              <ListSubheader>
                {state.axisOptions.xAxisOptions.length === 0
                  ? `No ${state.axisOptions.xAxisType.value} column created yet!`
                  : `${state.axisOptions.xAxisType.value} column(s)`}
              </ListSubheader>
              {state.axisOptions.xAxisOptions.map((col) => (
                <MenuItem key={col.field} value={col.field}>
                  {col.headerName}
                </MenuItem>
              ))}
            </Select>
            {state.axisOptions.selectedXAxis.length === 0 && (
              <ChartAxisDropdownFeedback
                axisName="X-Axis: Group By"
                columnTypeValue={state.axisOptions.xAxisType.value}
              />
            )}
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl
            fullWidth
            error={state.axisOptions.selectedBarValue.length === 0}
          >
            <InputLabel id="bar-value-select-label">Stack Label</InputLabel>
            <Select
              labelId="bar-value-select-label"
              id="bar-value-select"
              value={state.axisOptions.selectedBarValue}
              onChange={handleBarValueChange}
              label="Stack Label"
              variant="outlined"
            >
              <ListSubheader>
                {state.axisOptions.barValueOptions.length === 0
                  ? `No ${state.axisOptions.barValueType.value} column created yet!`
                  : `${state.axisOptions.barValueType.value} column(s)`}
              </ListSubheader>
              {state.axisOptions.barValueOptions.map((col) => (
                <MenuItem key={col.field} value={col.field}>
                  {col.headerName}
                </MenuItem>
              ))}
            </Select>
            {state.axisOptions.selectedBarValue.length === 0 && (
              <ChartAxisDropdownFeedback
                axisName="Stack Label"
                columnTypeValue={state.axisOptions.barValueType.value}
              />
            )}
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl
            fullWidth
            error={state.axisOptions.selectedYAxis.length === 0}
          >
            <InputLabel id="y-axis-select-label">Y-Axis</InputLabel>
            <Select
              labelId="y-axis-select-label"
              id="y-axis-select"
              value={state.axisOptions.selectedYAxis}
              onChange={handleYAxisChange}
              label="Y-Axis"
              variant="outlined"
            >
              <ListSubheader>
                {state.axisOptions.yAxisOptions.length === 0
                  ? `No ${state.axisOptions.yAxisType.value} column created yet!`
                  : `${state.axisOptions.yAxisType.value} column(s)`}
              </ListSubheader>
              {state.axisOptions.yAxisOptions.map((col) => (
                <MenuItem key={col.field} value={col.field}>
                  {col.headerName}
                </MenuItem>
              ))}
            </Select>
            {state.axisOptions.selectedYAxis.length === 0 && (
              <ChartAxisDropdownFeedback
                axisName="Y-Axis"
                columnTypeValue={state.axisOptions.yAxisType.value}
              />
            )}
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

        <Grow in={!customize} timeout={{ enter: 500, exit: 0 }} unmountOnExit>
          <Grid size={{ xs: 12 }} sx={{ minHeight: 600 }}>
            <Chart
              ref={chartRef}
              options={state.options}
              series={state.series}
              type={visRef.chart.code}
              height="100%"
            />
          </Grid>
        </Grow>

        <Grow in={customize} timeout={{ enter: 500, exit: 0 }} unmountOnExit>
          <Grid size={{ xs: 12, md: 8 }} sx={{ minHeight: 600 }}>
            <Chart
              ref={chartRef}
              options={state.options}
              series={state.series}
              type={visRef.chart.code}
              height="100%"
            />
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

export default StackedBarChart;
