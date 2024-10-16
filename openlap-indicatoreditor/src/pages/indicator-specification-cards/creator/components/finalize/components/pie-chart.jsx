import React, { useContext, useEffect, useState } from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import Chart from "react-apexcharts";

const PieChart = ({ dataset, visRef, setVisRef, preview = false }) => {
  const { darkMode } = useContext(CustomThemeContext);

  const [state, setState] = useState({
    series: [],
    options: {
      chart: {
        type: visRef.chart.code,
        width: "100%",
        foreColor: darkMode ? "#ffffff" : "#000000",
      },
      labels: [],
      legend: {
        position: "top",
        horizontalAlign: "center",
      },
      tooltip: {
        enabled: true,
        followCursor: true,
        theme: darkMode ? "dark" : "light",
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

      setState((prevState) => ({
        ...prevState,
        axisOptions: {
          xAxisOptions: stringColumns,
          yAxisOptions: numberColumns,
          selectedXAxis:
            prevState.axisOptions.selectedXAxis &&
            stringColumns.some(
              (col) => col.field === prevState.axisOptions.selectedXAxis,
            )
              ? prevState.axisOptions.selectedXAxis
              : stringColumns.length > 0
                ? stringColumns[0].field
                : "",
          selectedYAxis:
            prevState.axisOptions.selectedYAxis &&
            numberColumns.some(
              (col) => col.field === prevState.axisOptions.selectedYAxis,
            )
              ? prevState.axisOptions.selectedYAxis
              : numberColumns.length > 0
                ? numberColumns[0].field
                : "",
        },
      }));
    }
  }, [dataset, darkMode, visRef.chart.code]);

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns && !preview) {
      const { selectedXAxis, selectedYAxis } = state.axisOptions;

      if (selectedXAxis && selectedYAxis) {
        const groupedData = {};

        dataset.rows.forEach((row) => {
          const category = row[selectedXAxis];
          const value = row[selectedYAxis];

          if (groupedData[category]) {
            groupedData[category] += value;
          } else {
            groupedData[category] = value;
          }
        });

        const categories = Object.keys(groupedData);
        const seriesData = Object.values(groupedData);

        setState((prevState) => ({
          ...prevState,
          series: seriesData,
          options: {
            ...prevState.options,
            labels: categories,
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
        }));
      }
    }
  }, [
    dataset,
    state.axisOptions.selectedXAxis,
    state.axisOptions.selectedYAxis,
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

  return (
    <>
      <Grid container spacing={2}>
        {!preview && (
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel id="x-axis-select-label">Categories</InputLabel>
                  <Select
                    labelId="x-axis-select-label"
                    id="x-axis-select"
                    value={state.axisOptions.selectedXAxis}
                    onChange={handleXAxisChange}
                    label="Categories"
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
                  <InputLabel id="y-axis-select-label">Values</InputLabel>
                  <Select
                    labelId="y-axis-select-label"
                    id="y-axis-select"
                    value={state.axisOptions.selectedYAxis}
                    onChange={handleYAxisChange}
                    label="Values"
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

export default PieChart;
