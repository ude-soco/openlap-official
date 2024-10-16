import React, { useContext, useEffect, useState } from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import Chart from "react-apexcharts";
import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import { dark } from "@mui/material/styles/createPalette.js";

const BarChart = ({ dataset, visRef, setVisRef, preview = false }) => {
  const { darkMode } = useContext(CustomThemeContext);

  const [state, setState] = useState({
    series: [],
    options: {
      chart: {
        type: visRef.chart.code,
        stacked: false,
        width: "100%",
        foreColor: darkMode ? "#ffffff" : "#000000",
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false,
          grouped: false,
        },
      },
      xaxis: {
        name: "",
        categories: [],
      },
      legend: {
        position: "top",
        horizontalAlign: "center",
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

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns && !preview) {
      const stringColumns = dataset.columns.filter(
        (col) => col.type === "string",
      );
      const numberColumns = dataset.columns.filter(
        (col) => col.type === "number",
      );

      const updatedSelectedXAxis = state.axisOptions.selectedXAxis
        ? stringColumns.find(
            (col) => col.field === state.axisOptions.selectedXAxis,
          )?.field || ""
        : stringColumns.length > 0
          ? stringColumns[0].field
          : "";

      const updatedSelectedYAxis = state.axisOptions.selectedYAxis
        ? numberColumns.find(
            (col) => col.field === state.axisOptions.selectedYAxis,
          )?.field || ""
        : numberColumns.length > 0
          ? numberColumns[0].field
          : "";

      setState((prevState) => ({
        ...prevState,
        axisOptions: {
          xAxisOptions: stringColumns,
          yAxisOptions: numberColumns,
          selectedXAxis: updatedSelectedXAxis,
          selectedYAxis: updatedSelectedYAxis,
        },
      }));
    }
  }, [dataset]);

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns && !preview) {
      const { selectedXAxis, selectedYAxis } = state.axisOptions;
      const xAxisColumn = dataset.columns.find(
        (col) => col.field === selectedXAxis,
      );
      const yAxisColumn = dataset.columns.find(
        (col) => col.field === selectedYAxis,
      );

      if (!xAxisColumn || !yAxisColumn) return;

      // Group data by unique X-axis values
      const groupedData = dataset.rows.reduce((acc, row) => {
        const xValue = row[selectedXAxis] || "Unknown";
        acc[xValue] = (acc[xValue] || 0) + (row[selectedYAxis] || 0);
        return acc;
      }, {});

      // Prepare categories and series
      const categories = Object.keys(groupedData);
      const series = [
        {
          name: yAxisColumn.headerName || "Default Series",
          data: categories.map((category) => groupedData[category]),
        },
      ];

      setState((prevState) => ({
        ...prevState,
        series: series,
        options: {
          ...prevState.options,
          xaxis: {
            ...prevState.options.xaxis,
            categories: categories,
            name: xAxisColumn.headerName,
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
            type={visRef.chart.code}
            height="100%"
          />
        </Grid>
      </Grid>
    </>
  );
};

export default BarChart;
