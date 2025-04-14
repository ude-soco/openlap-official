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
  Grow,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import PaletteIcon from "@mui/icons-material/Palette";
import CloseIcon from "@mui/icons-material/Close";
import ScatterChartCustomizations from "./scatter-chart-customizations/scatter-chart-customizations.jsx";

export let StateContext = createContext();

const ScatterPlotChart = ({
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
    options: {
      chart: {
        type: visRef.chart.code,
        toolbar: {
          show: false,
        },
        zoom: {
          type: "xy",
        },
        foreColor: darkMode ? "#ffffff" : "#000000",
      },
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
      markers: {
        size: 8,
        colors: ["#008ffb"],
      },
      colors: ["#008ffb"],
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
      xaxis: {
        title: {
          text: "X Axis",
        },
        labels: {
          show: true,
          formatter: (value) => value.toLocaleString(),
        },
        categories: [],
      },
      yaxis: {
        title: {
          text: "Y Axis",
        },
        labels: {
          show: true,
          formatter: (value) => value.toLocaleString(),
        },
      },
      tooltip: {
        enabled: true,
        followCursor: true,
        theme: darkMode ? "dark" : "light",
        x: {
          formatter: function (val) {
            return `X: ${val}`;
          },
        },
        y: {
          formatter: function (val) {
            return `Y: ${val}`;
          },
        },
        z: {
          formatter: function (val) {
            return `Label: ${val}`;
          },
        },
      },
    },
    axisOptions: {
      xAxisOptions: [],
      yAxisOptions: [],
      labelOptions: [],
      selectedXAxis: "",
      selectedYAxis: "",
      selectedLabel: "",
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
    if (dataset && dataset.rows && dataset.columns && !preview) {
      const stringColumns = dataset.columns.filter(
        (col) => col.type === "string"
      );
      const numberColumns = dataset.columns.filter(
        (col) => col.type === "number"
      );

      const updatedSelectedLabel = state.axisOptions.selectedLabel
        ? stringColumns.find(
            (col) => col.field === state.axisOptions.selectedLabel
          )?.field || (stringColumns.length > 0 ? stringColumns[0].field : "")
        : stringColumns.length > 0
        ? stringColumns[0].field
        : "";

      const updatedSelectedXAxis = state.axisOptions.selectedXAxis
        ? numberColumns.find(
            (col) => col.field === state.axisOptions.selectedXAxis
          )?.field || (numberColumns.length > 0 ? numberColumns[0].field : "")
        : numberColumns.length > 0
        ? numberColumns[0].field
        : "";

      const updatedSelectedYAxis = state.axisOptions.selectedYAxis
        ? numberColumns.find(
            (col) => col.field === state.axisOptions.selectedYAxis
          )?.field ||
          (numberColumns.length > 0
            ? numberColumns[1]?.field
            : numberColumns[0]?.field || "")
        : numberColumns.length > 0
        ? numberColumns[1]?.field
        : numberColumns[0]?.field || "";

      setState((prevState) => ({
        ...prevState,
        axisOptions: {
          ...prevState.axisOptions,
          xAxisOptions: numberColumns,
          yAxisOptions: numberColumns,
          labelOptions: stringColumns,
          selectedXAxis: updatedSelectedXAxis,
          selectedYAxis: updatedSelectedYAxis,
          selectedLabel: updatedSelectedLabel,
        },
      }));
    }
  }, [dataset.columns.length, visRef.chart.code]);

  // * This effect is used to update the chart when the dataset changes.
  // * This will also run when the selected X-axis or Y-axis changes.
  // * It will group the data by unique X-axis values and prepare the series data.
  // * It will also update the chart options with the new categories and series data.
  useEffect(() => {
    const { selectedXAxis, selectedYAxis, selectedLabel } = state.axisOptions;
    const xColumn = dataset.columns.find((col) => col.field === selectedXAxis);
    const yColumn = dataset.columns.find((col) => col.field === selectedYAxis);
    const labelColumn = dataset.columns.find(
      (col) => col.field === selectedLabel
    );

    if (!xColumn || !yColumn || !labelColumn) return;

    const groupedData = {};
    let count = 1;

    for (const row of dataset.rows) {
      const label = row[labelColumn.field] || `Label not provided ${count++}`;
      const xVal = row[xColumn.field] || 0;
      const yVal = row[yColumn.field] || 0;

      if (!groupedData[label]) {
        groupedData[label] = { x: 0, y: 0, label };
      }
      groupedData[label].x += xVal;
      groupedData[label].y += yVal;
    }

    const data = Object.values(groupedData);

    // * Calculating the minimum and maximum for the x-axis for setting the range
    const xValues = data.map((item) => item.x);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);

    setState((prevState) => ({
      ...prevState,
      series: [
        {
          name: "Scatter Series",
          data: data.map((item) => ({
            x: item.x,
            y: item.y,
            z: item.label,
          })),
        },
      ],
      options: {
        ...prevState.options,
        xaxis: {
          ...prevState.options.xaxis,
          title: {
            text: xColumn ? xColumn.headerName : "X Axis",
          },
          tickAmount: 6, // * Setting the number of ticks (labels) on the x-axis
          min: minX, // * Setting the minimum value on the x-axis
          max: maxX, // * Setting the maximum value on the x-axis
          labels: {
            show: true,
            formatter: function (val) {
              return parseFloat(val).toFixed(2); // * Formatting the labels with 2 decimal points
            },
          },
        },
        yaxis: {
          ...prevState.options.yaxis,
          title: {
            text: yColumn ? yColumn.headerName : "Y Axis",
          },
          labels: {
            show: true,
            formatter: (value) => value.toLocaleString(),
          },
        },
        chart: {
          ...prevState.options.chart,
          foreColor: darkMode ? "#ffffff" : "#000000",
        },
        tooltip: {
          ...prevState.options.tooltip,
          theme: darkMode ? "dark" : "light",
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
    state.axisOptions.selectedLabel,
    darkMode,
    visRef.chart.code,
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
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedYAxis: event.target.value,
      },
    }));
  };

  const handleLabelChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedLabel: event.target.value,
      },
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        {!preview && (
          <>
            <Grid size={{ xs: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="x-axis-select-label">X Axis</InputLabel>
                <Select
                  labelId="x-axis-select-label"
                  id="x-axis-select"
                  value={state.axisOptions.selectedXAxis}
                  onChange={handleXAxisChange}
                  label="X Axis"
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
            <Grid size={{ xs: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="y-axis-select-label">Y Axis</InputLabel>
                <Select
                  labelId="y-axis-select-label"
                  id="y-axis-select"
                  value={state.axisOptions.selectedYAxis}
                  onChange={handleYAxisChange}
                  label="Y Axis"
                  variant="outlined"
                >
                  {state.axisOptions.yAxisOptions.map((col) => (
                    <MenuItem key={col.field} value={col.field}>
                      {col.headerName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="label-select-label">Labels</InputLabel>
                <Select
                  labelId="label-select-label"
                  id="label-select"
                  value={state.axisOptions.selectedLabel}
                  onChange={handleLabelChange}
                  label="Labels"
                  variant="outlined"
                >
                  {state.axisOptions.labelOptions.map((col) => (
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

        <Grow in={!customize} timeout={300} unmountOnExit>
          <Grid size={{ xs: 12 }} sx={{ minHeight: 600 }}>
            <Chart
              options={state.options}
              series={state.series}
              type={visRef.chart.code}
              height="100%"
            />
          </Grid>
        </Grow>

        <Grow in={customize} timeout={300} unmountOnExit>
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
        <Grow in={customize} timeout={300} unmountOnExit>
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
            <StateContext.Provider value={{ state, setState, chartRef }}>
              <ScatterChartCustomizations />
            </StateContext.Provider>
          </Grid>
        </Grow>
      </Grid>
    </>
  );
};

export default ScatterPlotChart;
