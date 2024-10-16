import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import Chart from "react-apexcharts";
import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import ScatterChartCustomizations from "./scatter-chart-customizations/scatter-chart-customizations.jsx";

export let StateContext = createContext();

const ScatterPlotChart = ({
  dataset,
  visRef,
  setVisRef,
  preview = false,
  customize,
  setCustomize,
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
          fontSize: 30,
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

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns) {
      const stringColumns = dataset.columns.filter(
        (col) => col.type === "string"
      );
      const numberColumns = dataset.columns.filter(
        (col) => col.type === "number"
      );

      setState((prevState) => ({
        ...prevState,
        axisOptions: {
          xAxisOptions: numberColumns,
          yAxisOptions: numberColumns,
          labelOptions: stringColumns,
          selectedXAxis:
            prevState.axisOptions.selectedXAxis ||
            (numberColumns.length > 0 ? numberColumns[0].field : ""),
          selectedYAxis:
            prevState.axisOptions.selectedYAxis ||
            (numberColumns.length > 0
              ? numberColumns[1]?.field
              : numberColumns[0]?.field || ""),
          selectedLabel:
            prevState.axisOptions.selectedLabel ||
            (stringColumns.length > 0 ? stringColumns[0].field : ""),
        },
      }));
    }
  }, [dataset, darkMode, visRef.chart.code]);

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns) {
      const { selectedXAxis, selectedYAxis, selectedLabel } = state.axisOptions;
      const xColumn = dataset.columns.find(
        (col) => col.field === selectedXAxis
      );
      const yColumn = dataset.columns.find(
        (col) => col.field === selectedYAxis
      );
      const labelColumn = dataset.columns.find(
        (col) => col.field === selectedLabel
      );

      const defaultData = [{ x: 0, y: 0, label: "Default Point" }];

      const data =
        dataset.rows.map((row) => ({
          x: xColumn ? row[xColumn.field] || 0 : 0,
          y: yColumn ? row[yColumn.field] || 0 : 0,
          label: labelColumn ? row[labelColumn.field] || "Unknown" : "Unknown",
        })) || defaultData;

      // Calculate min and max for the x-axis for setting the range
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
            tickAmount: 6, // This sets the number of ticks (labels) on the x-axis
            min: minX, // Minimum value on the x-axis
            max: maxX, // Maximum value on the x-axis
            labels: {
              show: true,
              formatter: function (val) {
                return parseFloat(val).toFixed(2); // Format the labels with 2 decimal points
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
    }
  }, [
    dataset,
    state.axisOptions.selectedXAxis,
    state.axisOptions.selectedYAxis,
    state.axisOptions.selectedLabel,
    darkMode,
    visRef.chart.code,
  ]);

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
  }, [state.series, state.options, state.axisOptions]);

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
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={4}>
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
              <Grid item xs={4}>
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
              <Grid item xs={4}>
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
            </Grid>
          </Grid>
        )}
        <Grid
          item
          xs={12}
          lg={customize ? 8 : 12}
          md={customize ? 8 : 12}
          xl={customize ? 8 : 12}
          sx={{ minHeight: 600, transition: "all 0.5s ease" }}
        >
          <Chart
            options={state.options}
            series={state.series}
            type={visRef.chart.code}
            height="100%"
          />
        </Grid>
        {customize && (
          <Grid item xs={12} lg={4} md={4} xl={4} sx={{ minHeight: 600 }}>
            <StateContext.Provider value={{ state, setState, chartRef }}>
              <ScatterChartCustomizations />
            </StateContext.Provider>
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default ScatterPlotChart;
