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
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import Chart from "react-apexcharts";
import Grid from "@mui/material/Grid2";
import PaletteIcon from "@mui/icons-material/Palette";
import CloseIcon from "@mui/icons-material/Close";
import StackedChartCustomizations from "./stacked-chart-customizations/stacked-chart-customizations.jsx";

export let StateContext = createContext();

const StackedBarChart = ({
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
        type: visRef.chart.code,
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

  // Utility function to find suitable column or default
  const getAvailableColumn = (currentField, columns) => {
    const column = columns.find((col) => col.field === currentField);
    if (column) return column.field;

    const firstAvailable = columns.length > 0 ? columns[0].field : "";
    return firstAvailable;
  };

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
        const newBarValue = findNextAvailableColumn(
          prevState.axisOptions.selectedBarValue,
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
            barValueOptions: stringColumns,
            yAxisOptions: numberColumns,
            selectedXAxis: newXAxis,
            selectedBarValue: newBarValue,
            selectedYAxis: newYAxis,
          },
        };
      });
    }
  }, [dataset, darkMode]);

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns && !preview) {
      const { selectedXAxis, selectedBarValue, selectedYAxis } =
        state.axisOptions;

      // Group and sum values by xAxis
      const aggregatedData = dataset.rows.reduce((acc, row) => {
        const category = row[selectedXAxis];
        const value = row[selectedYAxis] || 0;

        if (!acc[category]) {
          acc[category] = { name: category, data: {} };
        }

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

      setState((prevState) => ({
        ...prevState,
        series: series,
        options: {
          ...prevState.options,
          xaxis: {
            ...prevState.options.xaxis,
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
            ...prevState.options.yaxis,
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
            ...prevState.options.plotOptions,
            bar: {
              ...prevState.options.plotOptions.bar,
              stacked: true,
            },
          },
        },
      }));
    }
  }, [
    dataset,
    state.axisOptions.selectedXAxis,
    state.axisOptions.selectedBarValue,
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

  const handleBarValueChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedBarValue: event.target.value,
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
            <Grid size={{ xs: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="x-axis-select-label">Group By</InputLabel>
                <Select
                  labelId="x-axis-select-label"
                  id="x-axis-select"
                  value={state.axisOptions.selectedXAxis}
                  onChange={handleXAxisChange}
                  label="Group By"
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
                <InputLabel id="bar-value-select-label">
                  Bar Value Label
                </InputLabel>
                <Select
                  labelId="bar-value-select-label"
                  id="bar-value-select"
                  value={state.axisOptions.selectedBarValue}
                  onChange={handleBarValueChange}
                  label="Bar Value Label"
                  variant="outlined"
                >
                  {state.axisOptions.barValueOptions.map((col) => (
                    <MenuItem key={col.field} value={col.field}>
                      {col.headerName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 4 }}>
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
                type={visRef.chart.code}
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
                  type={visRef.chart.code}
                  height="100%"
                />
              </Grid>
            </Grow>
            <Grow in={customize} timeout={300}>
              <Grid size={{ xs: 12, md: 4 }} sx={{ minHeight: 600 }}>
                <StateContext.Provider value={{ state, setState, chartRef }}>
                  <StackedChartCustomizations />
                </StateContext.Provider>
              </Grid>
            </Grow>
          </>
        )}
      </Grid>
    </>
  );
};

export default StackedBarChart;
