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
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import PaletteIcon from "@mui/icons-material/Palette";
import CloseIcon from "@mui/icons-material/Close";
import RadarChartCustomizations from "./radar-chart-customizations/radar-chart-customizations.jsx";

export let StateContext = createContext();

const RadarChart = ({
  dataset,
  visRef,
  setVisRef,
  preview = false,
  customize,
  handleToggleCustomizePanel,
}) => {
  const { darkMode } = useContext(CustomThemeContext);
  const chartRef = useRef(null);

  const [state, setState] = useState({
    series: [],
    options: {
      chart: {
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
        categories: [],
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

      const updatedSelectedXAxis = state.axisOptions.selectedXAxis
        ? stringColumns.find(
            (col) => col.field === state.axisOptions.selectedXAxis
          )?.field || ""
        : stringColumns.length > 0
        ? stringColumns[0].field
        : "";

      const updatedSelectedYAxis = state.axisOptions.selectedYAxis.filter(
        (field) => numberColumns.find((col) => col.field === field)
      );

      setState((prevState) => ({
        ...prevState,
        axisOptions: {
          xAxisOptions: stringColumns,
          yAxisOptions: numberColumns,
          selectedXAxis: updatedSelectedXAxis,
          selectedYAxis:
            updatedSelectedYAxis.length > 0
              ? updatedSelectedYAxis
              : numberColumns.map((col) => col.field),
        },
      }));
    }
  }, [dataset]);

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns && !preview) {
      const { selectedXAxis, selectedYAxis } = state.axisOptions;
      const xAxisColumn = dataset.columns.find(
        (col) => col.field === selectedXAxis
      );

      if (!xAxisColumn || selectedYAxis.length === 0) return;

      // Group data by unique X-axis values and sum Y-axis values
      const groupedData = dataset.rows.reduce((acc, row) => {
        const xValue = row[selectedXAxis] || "Unknown";
        if (!acc[xValue]) acc[xValue] = {};
        selectedYAxis.forEach((yField) => {
          if (!acc[xValue][yField]) acc[xValue][yField] = 0;
          acc[xValue][yField] += row[yField] || 0;
        });
        return acc;
      }, {});

      // Prepare categories and series
      const categories = Object.keys(groupedData);
      const series = selectedYAxis.map((yField) => ({
        name:
          dataset.columns.find((col) => col.field === yField)?.headerName ||
          "Default Series",
        data: categories.map((category) => groupedData[category][yField]),
      }));

      setState((prevState) => ({
        ...prevState,
        series: series,
        options: {
          ...prevState.options,
          xaxis: {
            ...prevState.options.xaxis,
            categories: categories,
          },
        },
      }));
    }
  }, [
    dataset,
    state.axisOptions.selectedXAxis,
    state.axisOptions.selectedYAxis,
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
    const { value } = event.target;
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedYAxis: typeof value === "string" ? value.split(",") : value,
      },
    }));
  };

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
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={2} justifyContent="flex-end">
                <Button
                  startIcon={customize ? undefined : <PaletteIcon />}
                  endIcon={customize ? <CloseIcon /> : undefined}
                  variant={customize ? undefined : "contained"}
                  onClick={handleToggleCustomizePanel}
                >
                  {!customize ? "Customize" : "Close customization"}
                </Button>
              </Grid>
            </Grid>
          </>
        )}
        {!customize && (
          <Grow in={!customize} timeout={300}>
            <Grid size={{ xs: 12 }} sx={{ minHeight: 600 }}>
              <Chart
                ref={chartRef}
                options={state.options}
                series={state.series}
                type="radar"
                height="100%"
              />
            </Grid>
          </Grow>
        )}
        {customize && (
          <>
            <Grow in={customize} timeout={300}>
              <Grid size={{ xs: 12, md: 8 }} sx={{ minHeight: 600 }}>
                <Chart
                  ref={chartRef}
                  options={state.options}
                  series={state.series}
                  type="radar"
                  height="100%"
                />
              </Grid>
            </Grow>
            <Grow in={customize} timeout={300}>
              <Grid size={{ xs: 12, md: 4 }} sx={{ minHeight: 600 }}>
                <StateContext.Provider value={{ state, setState, chartRef }}>
                  <RadarChartCustomizations />
                </StateContext.Provider>
              </Grid>
            </Grow>
          </>
        )}
      </Grid>
    </>
  );
};

export default RadarChart;
