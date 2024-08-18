import React, { useContext, useEffect, useState } from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import Chart from "react-apexcharts";

const PieChart = () => {
  const { darkMode } = useContext(CustomThemeContext);
  const { dataset, visRef } = useContext(ISCContext);

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
    if (dataset && dataset.rows && dataset.columns) {
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
            prevState.axisOptions.selectedXAxis ||
            (stringColumns.length > 0 ? stringColumns[0].field : ""),
          selectedYAxis:
            prevState.axisOptions.selectedYAxis ||
            (numberColumns.length > 0 ? numberColumns[0].field : ""),
        },
      }));
    }
  }, [dataset, darkMode, visRef.chart.code]);

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns) {
      const { selectedXAxis, selectedYAxis } = state.axisOptions;
      const categoryColumn = dataset.columns.find(
        (col) => col.field === selectedXAxis,
      );
      const valueColumn = dataset.columns.find(
        (col) => col.field === selectedYAxis,
      );

      const defaultCategories = [
        "Default Category 1",
        "Default Category 2",
        "Default Category 3",
      ];
      const defaultSeriesData = [0, 0, 0];

      const categories = categoryColumn
        ? dataset.rows.map((row) => row[categoryColumn.field] || "Unknown")
        : defaultCategories;

      const seriesData = valueColumn
        ? dataset.rows.map((row) => row[valueColumn.field] || 0)
        : defaultSeriesData;

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
  }, [
    dataset,
    state.axisOptions.selectedXAxis,
    state.axisOptions.selectedYAxis,
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

  return (
    <>
      <Grid container spacing={2}>
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
