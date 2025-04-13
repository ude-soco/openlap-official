import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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
import Chart from "react-apexcharts";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import DotChartCustomizations from "./dot-chart-customizations/dot-chart-customizations.jsx";
import Grid from "@mui/material/Grid2";
import PaletteIcon from "@mui/icons-material/Palette";
import CloseIcon from "@mui/icons-material/Close";

export let StateContext = createContext();

const DotChart = ({
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
        type: "scatter",
        width: "100%",
        foreColor: darkMode ? "#ffffff" : "#000000",
        toolbar: {
          show: false,
        },
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
      xaxis: {
        categories: [],
        title: {
          text: "X-Axis",
        },
        labels: {
          show: true,
          formatter: (value) => value,
        },
      },
      yaxis: {
        title: {
          text: "Y-Axis",
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
    },
    axisOptions: {
      xAxisOptions: [],
      yAxisOptions: [],
      selectedXAxis: "",
      selectedYAxis: "",
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

  // Utility function to find the next available column
  const findNextAvailableColumn = (selectedField, availableColumns) => {
    return (
      availableColumns.find((col) => col.field === selectedField)?.field ||
      (availableColumns.length > 0 ? availableColumns[0].field : "")
    );
  };

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns && !preview) {
      const stringColumns = dataset.columns.filter(
        (col) => col.type === "string"
      );
      const numberColumns = dataset.columns.filter(
        (col) => col.type === "number"
      );

      setState((prevState) => {
        // Ensure columns are reselected or defaulted if needed
        const newXAxis = findNextAvailableColumn(
          prevState.axisOptions.selectedXAxis,
          stringColumns
        );
        const newYAxis = findNextAvailableColumn(
          prevState.axisOptions.selectedYAxis,
          numberColumns
        );

        return {
          ...prevState,
          options: {
            ...prevState.options,
            chart: {
              ...prevState.options.chart,
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
            selectedXAxis: newXAxis,
            selectedYAxis: newYAxis,
          },
        };
      });
    }
  }, [dataset, darkMode]);

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns && !preview) {
      const { selectedXAxis, selectedYAxis } = state.axisOptions;

      if (!selectedXAxis || !selectedYAxis) return;

      // Sort data by the selected X-axis column
      const sortedRows = [...dataset.rows].sort((a, b) => {
        const aValue = a[selectedXAxis];
        const bValue = b[selectedXAxis];
        return aValue.localeCompare(bValue);
      });

      // Generate series data for the scatter plot
      const series = [
        {
          name: "Data Points",
          data: sortedRows.map((row) => ({
            x: row[selectedXAxis] || "Unknown",
            y: row[selectedYAxis] || 0,
          })),
        },
      ];

      // Create X-axis categories based on sorted data
      const categories = [
        ...new Set(sortedRows.map((row) => row[selectedXAxis] || "Unknown")),
      ];

      setState((prevState) => ({
        ...prevState,
        series: series,
        options: {
          ...prevState.options,
          xaxis: {
            ...prevState.options.xaxis,
            categories: categories,
            title: {
              text:
                dataset.columns.find((col) => col.field === selectedXAxis)
                  ?.headerName || "X-Axis",
            },
          },
          yaxis: {
            ...prevState.options.yaxis,
            title: {
              text:
                dataset.columns.find((col) => col.field === selectedYAxis)
                  ?.headerName || "Y-Axis",
            },
          },
        },
      }));
    }
  }, [
    dataset,
    state.axisOptions.selectedXAxis,
    state.axisOptions.selectedYAxis,
    darkMode,
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
                  value={state.axisOptions.selectedYAxis}
                  onChange={handleYAxisChange}
                  label="Y-Axis"
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
              ref={chartRef}
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
              options={state.options}
              series={state.series}
              type="scatter"
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
              <DotChartCustomizations />
            </StateContext.Provider>
          </Grid>
        </Grow>
      </Grid>
    </>
  );
};

export default DotChart;
