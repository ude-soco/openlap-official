import React, { useContext, useEffect, useState } from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import Chart from "react-apexcharts";
import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import { ISCContext } from "../../../indicator-specification-card.jsx";

const BarChart = () => {
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
        },
      },
      xaxis: {
        name: "",
        categories: [],
        convertedCatToNumeric: true,
        field: "categories",
        unique: false,
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
      selectedYAxis: [],
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

      // Ensure selected axes are in the dataset
      const updatedSelectedXAxis = state.axisOptions.selectedXAxis
        ? stringColumns.find(
            (col) => col.field === state.axisOptions.selectedXAxis,
          )?.field || ""
        : stringColumns.length > 0
          ? stringColumns[0].field
          : "";

      const updatedSelectedYAxis = state.axisOptions.selectedYAxis.filter(
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
          selectedYAxis:
            updatedSelectedYAxis.length > 0
              ? updatedSelectedYAxis
              : numberColumns.map((col) => col.field),
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

      const categories = categoryColumn
        ? dataset.rows.map((row) => row[categoryColumn.field] || "Unknown")
        : ["Default Category 1", "Default Category 2", "Default Category 3"];

      const series = selectedYAxis.map((yField) => {
        const valueColumn = dataset.columns.find((col) => col.field === yField);
        const seriesData = valueColumn
          ? dataset.rows.map((row) => row[valueColumn.field] || 0)
          : [0, 0, 0];

        return {
          name: valueColumn ? valueColumn.headerName : "Default Series",
          data: seriesData,
          field: yField,
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
          chart: {
            ...prevState.options.chart,
            type: visRef.chart.code,
            foreColor: darkMode ? "#ffffff" : "#000000",
          },
          tooltip: {
            ...prevState.options.tooltip,
            theme: darkMode ? "dark" : "light",
          },
          plotOptions: {
            bar: {
              ...prevState.options.plotOptions.bar,
              grouped: selectedYAxis.length > 1, // Handle grouping for multiple Y-axes
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
                  multiple
                  value={state.axisOptions.selectedYAxis}
                  onChange={handleYAxisChange}
                  label="Y-Axis"
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

export default BarChart;
