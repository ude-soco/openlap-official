import React, { useContext, useEffect, useState } from "react";
import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import Chart from "react-apexcharts";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";

const DotChart = ({ dataset, setVisRef, preview = false }) => {
  const { darkMode } = useContext(CustomThemeContext);

  const [state, setState] = useState({
    series: [],
    options: {
      chart: {
        type: "scatter",
        width: "100%",
        foreColor: darkMode ? "#ffffff" : "#000000",
      },
      xaxis: {
        categories: [],
        title: {
          text: "X-Axis",
        },
        labels: {
          formatter: (value) => value,
        },
      },
      yaxis: {
        title: {
          text: "Y-Axis",
        },
        labels: {
          formatter: (value) => value.toLocaleString(),
        },
      },
      tooltip: {
        enabled: true,
        followCursor: true,
        theme: darkMode ? "dark" : "light",
      },
      legend: {
        position: "top",
        horizontalAlign: "center",
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
        options: visRef.data.options,
        axisOptions: visRef.data.axisOptions,
      }));
    }
  }, []);

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
        (col) => col.type === "string",
      );
      const numberColumns = dataset.columns.filter(
        (col) => col.type === "number",
      );

      setState((prevState) => {
        // Ensure columns are reselected or defaulted if needed
        const newXAxis = findNextAvailableColumn(
          prevState.axisOptions.selectedXAxis,
          stringColumns,
        );
        const newYAxis = findNextAvailableColumn(
          prevState.axisOptions.selectedYAxis,
          numberColumns,
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
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
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
              <Grid item xs={6}>
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
            </Grid>
          </Grid>
        )}
        <Grid item xs={12} sx={{ minHeight: 600 }}>
          <Chart
            options={state.options}
            series={state.series}
            type="scatter"
            height="100%"
          />
        </Grid>
      </Grid>
    </>
  );
};

export default DotChart;
