import React, { useContext, useEffect, useState } from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import Chart from "react-apexcharts";
import {
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { ISCContext } from "../../../indicator-specification-card.jsx";

const GroupedBarChart = () => {
  const { darkMode } = useContext(CustomThemeContext);
  const { dataset, visRef } = useContext(ISCContext);

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
          grouped: true,
        },
      },
      xaxis: {
        categories: [],
        name: "",
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
      selectedYAxes: [],
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

      // Update selected X and Y axes
      const updatedSelectedXAxis = state.axisOptions.selectedXAxis
        ? stringColumns.find(
            (col) => col.field === state.axisOptions.selectedXAxis,
          )?.field || ""
        : stringColumns.length > 0
          ? stringColumns[0].field
          : "";

      const updatedSelectedYAxes = state.axisOptions.selectedYAxes.filter(
        (field) => numberColumns.find((col) => col.field === field),
      );

      setState((prevState) => ({
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
          yAxisOptions: numberColumns,
          selectedXAxis: updatedSelectedXAxis,
          selectedYAxes:
            updatedSelectedYAxes.length > 0
              ? updatedSelectedYAxes
              : [numberColumns[0]?.field],
        },
      }));
    }
  }, [dataset, darkMode, visRef.chart.code]);

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns) {
      const { selectedXAxis, selectedYAxes } = state.axisOptions;
      const categoryColumn = dataset.columns.find(
        (col) => col.field === selectedXAxis,
      );

      // Get unique categories for X-axis
      const categories = categoryColumn
        ? [...new Set(dataset.rows.map((row) => row[categoryColumn.field]))]
        : [];

      // Aggregate data based on selected Y-axes and X-axis categories
      const series = selectedYAxes.map((yField) => {
        const valueColumn = dataset.columns.find((col) => col.field === yField);
        const seriesData = categories.map((category) => {
          return dataset.rows
            .filter((row) => row[categoryColumn.field] === category)
            .reduce((acc, row) => acc + (row[valueColumn.field] || 0), 0);
        });

        return {
          name: valueColumn ? valueColumn.headerName : "Default Series",
          data: seriesData,
        };
      });

      setState((prevState) => ({
        ...prevState,
        series: series,
        options: {
          ...prevState.options,
          xaxis: {
            ...prevState.options.xaxis,
            categories: categories,
            name: categoryColumn
              ? categoryColumn.headerName
              : "Default Categories",
          },
        },
      }));
    }
  }, [
    dataset,
    state.axisOptions.selectedXAxis,
    state.axisOptions.selectedYAxes,
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

  const handleYAxesChange = (event) => {
    const { value } = event.target;
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedYAxes: typeof value === "string" ? value.split(",") : value,
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
                <InputLabel id="y-axes-select-label">Y-Axes</InputLabel>
                <Select
                  labelId="y-axes-select-label"
                  id="y-axes-select"
                  multiple
                  value={state.axisOptions.selectedYAxes}
                  onChange={handleYAxesChange}
                  label="Y-Axes"
                  variant="outlined"
                  renderValue={(selected) =>
                    selected
                      .map((value) => {
                        const column = state.axisOptions.yAxisOptions.find(
                          (col) => col.field === value,
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

export default GroupedBarChart;
