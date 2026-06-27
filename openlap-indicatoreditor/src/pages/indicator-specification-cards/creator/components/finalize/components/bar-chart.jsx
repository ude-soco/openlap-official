import { useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import Chart from "react-apexcharts";
import {
  Button,
  FormControl,
  FormHelperText,
  Grow,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Grid,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import PaletteIcon from "@mui/icons-material/Palette";
import CloseIcon from "@mui/icons-material/Close";
import CustomizationPanel from "./customization-panel/customization-panel.jsx";
import { ISCContext } from "../../../isc-context.js";
import { DataTypes } from "../../../utils/data/config.js";
import ChartAxisDropdownFeedback from "./chart-axis-dropdown-feedback.jsx";
import { AXIS_INTRO, getAxisLabels } from "../utils/axis-labels.js";

const BarChart = ({ customize = false, handleToggleCustomizePanel }) => {
  const { darkMode } = useContext(CustomThemeContext);
  const { visRef, setVisRef, dataset } = useContext(ISCContext);
  const chartRef = useRef(null);
  const axisLabels = getAxisLabels("bar");

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
      isSeriesSingleColor: true,
      isSeriesMultipleColor: false,
      isSortingOrderChangeable: true,
      isLegendTextColorAvailable: true,
      isDataLabelsColorAvailable: true,
      isDataLabelsWithBackgroundColorAvailable: true,
      isShowHideXAxisTitleAvailable: true,
      isShowHideYAxisTitleAvailable: true,
      isShowHideAxesTitleAvailable: true,
      isSortingOrderAscendingAvailable: true,
      isSortingOrderDescendingAvailable: true,
      isCategoriesFilteringAvailable: true,
    },
    options: visRef.edit
      ? visRef.data.options
      : {
          chart: {
            id: visRef.chart.code,
            type: "bar",
            stacked: false,
            width: "100%",
            foreColor: darkMode ? "#ffffff" : "#000000",
            toolbar: {
              show: false,
              autoSelected: "zoom",
            },
            zoom: {
              enabled: true,
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
          plotOptions: {
            bar: {
              borderRadius: 4,
              horizontal: false,
              grouped: false,
              dataLabels: {
                position: "center",
              },
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
          markers: {
            colors: ["#008ffb"],
          },
        },
    axisOptions: {
      xAxisOptions: [],
      yAxisOptions: [],
      selectedXAxis: "",
      selectedYAxis: "",
      xAxisType: DataTypes.categorical,
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
        tooltip: {
          ...p.options.tooltip,
          theme: darkMode ? "dark" : "light",
        },
      },
    }));
  }, [darkMode]);

  // * This effect is used to update the chart when the dataset column changes.
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
      },
    }));
    setVisRef((p) => ({
      ...p,
      data: {
        ...p.data,
        axisOptions: {
          ...p.data.axisOptions,
          xAxisOptions: stringColumns,
          yAxisOptions: numberColumns,
        },
      },
      edit: false,
    }));
  }, [dataset]);

  // * This effect is used to update the chart when the selected X-axis or Y-axis changes.
  useEffect(() => {
    const selectedXAxis =
      visRef.data.axisOptions.selectedXAxis || state.axisOptions.selectedXAxis;
    const selectedYAxis =
      visRef.data.axisOptions.selectedYAxis || state.axisOptions.selectedYAxis;
    const stringColumns =
      visRef.data.axisOptions.xAxisOptions || state.axisOptions.xAxisOptions;
    const numberColumns =
      visRef.data.axisOptions.yAxisOptions || state.axisOptions.yAxisOptions;

    let updatedSelectedXAxis = "";
    if (visRef.edit && selectedXAxis.length !== 0)
      updatedSelectedXAxis = selectedXAxis;
    else if (selectedXAxis.length !== 0) {
      updatedSelectedXAxis =
        stringColumns.find((col) => col.field === selectedXAxis)?.field ||
        (stringColumns.length > 0 ? stringColumns[0].field : "");
    } else {
      updatedSelectedXAxis =
        stringColumns.length > 0 ? stringColumns[0].field : "";
    }

    let updatedSelectedYAxis = "";
    if (visRef.edit && selectedYAxis.length !== 0)
      updatedSelectedYAxis = selectedYAxis;
    else if (selectedYAxis.length !== 0) {
      updatedSelectedYAxis =
        numberColumns.find((col) => col.field === selectedYAxis)?.field ||
        (numberColumns.length > 0 ? numberColumns[0].field : "");
    } else {
      updatedSelectedYAxis =
        numberColumns.length > 0 ? numberColumns[0].field : "";
    }

    setState((p) => ({
      ...p,
      axisOptions: {
        ...p.axisOptions,
        selectedXAxis: updatedSelectedXAxis,
        selectedYAxis: updatedSelectedYAxis,
      },
    }));
  }, [
    visRef.data.axisOptions.xAxisOptions,
    visRef.data.axisOptions.yAxisOptions,
  ]);

  // * This effect is used to update the chart when the selected X-axis or Y-axis changes.
  useEffect(() => {
    const { selectedXAxis, selectedYAxis } = state.axisOptions;
    const xAxisColumn = dataset.columns.find(
      (col) => col.field === selectedXAxis
    );
    const yAxisColumn = dataset.columns.find(
      (col) => col.field === selectedYAxis
    );

    if (!xAxisColumn || !yAxisColumn) return;

    // * Grouping data by unique X-axis values
    const groupedData = dataset.rows.reduce((acc, row) => {
      const xValue = row[selectedXAxis] || "Unknown";
      acc[xValue] = (acc[xValue] || 0) + (row[selectedYAxis] || 0);
      return acc;
    }, {});

    // * Preparing categories and series for the chart
    const categories = Object.keys(groupedData);
    const series = [
      {
        name: yAxisColumn.headerName || "Default Series",
        data: categories.map((category) => groupedData[category]),
        color: customize
          ? state.series[0]?.color
          : visRef.data.series[0]?.color || "#008FFB",
      },
    ];

    setState((p) => {
      let tempState = {
        ...p,
        series: series,
        options: {
          ...p.options,
          xaxis: {
            ...p.options.xaxis,
            categories: categories,
            name: xAxisColumn.headerName,
            title: {
              ...p.options.xaxis.title,
              text: xAxisColumn.headerName,
            },
          },
          yaxis: {
            ...p.options.yaxis,
            categories: categories,
            title: {
              ...p.options.yaxis.title,
              text: yAxisColumn.headerName,
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
            selectedYAxis: state.axisOptions.selectedYAxis,
          },
        },
        edit: false,
      }));
      return tempState;
    });
  }, [
    dataset,
    state.axisOptions.selectedXAxis,
    state.axisOptions.selectedYAxis,
  ]);

  const handleXAxisChange = (e) => {
    setState((p) => ({
      ...p,
      axisOptions: {
        ...p.axisOptions,
        selectedXAxis: e.target.value,
      },
      options: {
        ...p.options,
        xaxis: {
          ...p.options.xaxis,
          title: {
            ...p.options.xaxis.title,
            text: p.axisOptions.selectedXAxis,
          },
        },
      },
    }));
  };

  const handleYAxisChange = (e) => {
    setState((p) => ({
      ...p,
      axisOptions: {
        ...p.axisOptions,
        selectedYAxis: e.target.value,
      },
      options: {
        ...p.options,
        yaxis: {
          ...p.options.yaxis,
          title: {
            ...p.options.yaxis.title,
            text: p.options.yaxis.selectedYAxis,
          },
        },
      },
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="body2" color="text.secondary">
            {AXIS_INTRO}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl
            fullWidth
            error={state.axisOptions.selectedXAxis.length === 0}
          >
            <InputLabel id="x-axis-select-label">
              {axisLabels.group.label}
            </InputLabel>
            <Select
              labelId="x-axis-select-label"
              id="x-axis-select"
              value={state.axisOptions.selectedXAxis}
              onChange={handleXAxisChange}
              label={axisLabels.group.label}
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
            <FormHelperText>{axisLabels.group.help}</FormHelperText>
            {state.axisOptions.selectedXAxis.length === 0 && (
              <ChartAxisDropdownFeedback
                axisName={axisLabels.group.label}
                columnTypeValue={state.axisOptions.xAxisType.value}
              />
            )}
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl
            fullWidth
            error={state.axisOptions.selectedYAxis.length === 0}
          >
            <InputLabel id="y-axis-select-label">
              {axisLabels.measure.label}
            </InputLabel>
            <Select
              labelId="y-axis-select-label"
              id="y-axis-select"
              value={state.axisOptions.selectedYAxis}
              onChange={handleYAxisChange}
              label={axisLabels.measure.label}
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
            <FormHelperText>{axisLabels.measure.help}</FormHelperText>
            {state.axisOptions.selectedYAxis.length === 0 && (
              <ChartAxisDropdownFeedback
                axisName={axisLabels.measure.label}
                columnTypeValue={state.axisOptions.yAxisType.value}
              />
            )}
          </FormControl>
        </Grid>
        {!customize && (
          <Grid size={{ xs: 12 }}>
            <Grid
              container
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="subtitle2" component="h4">
                Chart preview
              </Typography>
              <Button
                aria-expanded={customize}
                startIcon={<PaletteIcon />}
                variant="contained"
                onClick={handleToggleCustomizePanel}
              >
                Customize chart
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
            <Typography variant="subtitle2" component="h4" gutterBottom>
              Chart preview
            </Typography>
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
              alignItems="flex-start"
            >
              <Grid>
                <Typography component="h4">Chart appearance</Typography>
                <Typography variant="caption" color="text.secondary">
                  Optional settings for labels, colors, legend, and filters.
                </Typography>
              </Grid>
              <Tooltip title="Close">
                <IconButton aria-label="Close customization" onClick={handleToggleCustomizePanel}>
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

BarChart.propTypes = {
  customize: PropTypes.bool,
  handleToggleCustomizePanel: PropTypes.func,
};

export default BarChart;
