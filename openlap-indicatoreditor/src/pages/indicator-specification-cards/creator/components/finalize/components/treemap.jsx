import React, { useContext, useEffect, useState } from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import Chart from "react-apexcharts";

const TreeMap = () => {
  const { darkMode } = useContext(CustomThemeContext);
  const { dataset } = useContext(ISCContext);

  const [state, setState] = useState({
    series: [],
    options: {
      chart: {
        type: "treemap",
        width: "100%",
        foreColor: darkMode ? "#ffffff" : "#000000",
      },
      plotOptions: {
        treemap: {
          distributed: true,
        },
      },
      title: {
        text: "TreeMap",
      },
      tooltip: {
        enabled: true,
        followCursor: true,
        theme: darkMode ? "dark" : "light",
      },
      legend: {
        show: false,
      },
    },
    axisOptions: {
      xAxisOptions: [],
      yAxisOptions: [],
      selectedCategory: "",
      selectedValue: "",
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

      setState((prevState) => {
        const newCategory =
          prevState.axisOptions.selectedCategory ||
          (stringColumns.length > 0 ? stringColumns[0].field : "");
        const newValue =
          prevState.axisOptions.selectedValue ||
          (numberColumns.length > 0 ? numberColumns[0].field : "");

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
            selectedCategory: newCategory,
            selectedValue: newValue,
          },
        };
      });
    }
  }, [dataset, darkMode]);

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns) {
      const { selectedCategory, selectedValue } = state.axisOptions;

      if (!selectedCategory || !selectedValue) return;

      try {
        // Ensure data is correctly formatted
        const hierarchicalData = dataset.rows.reduce((acc, row) => {
          const category = row[selectedCategory] || "Unknown";
          const value = row[selectedValue] || 0;

          if (!acc[category]) {
            acc[category] = {
              name: category,
              data: [],
            };
          }

          acc[category].data.push({
            name: row.id || "Unnamed",
            value: value,
          });

          return acc;
        }, {});

        const series = Object.keys(hierarchicalData).map((key) => ({
          name: key,
          data: hierarchicalData[key].data,
        }));

        console.log("Treemap Series:", series); // Debugging output

        setState((prevState) => ({
          ...prevState,
          series: series,
          options: {
            ...prevState.options,
            title: {
              text:
                dataset.columns.find((col) => col.field === selectedCategory)
                  ?.headerName || "Category",
            },
          },
        }));
      } catch (error) {
        console.error("Error processing data for treemap:", error);
      }
    }
  }, [
    dataset,
    state.axisOptions.selectedCategory,
    state.axisOptions.selectedValue,
    darkMode,
  ]);

  const handleCategoryChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedCategory: event.target.value,
      },
    }));
  };

  const handleValueChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedValue: event.target.value,
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
                <InputLabel id="category-select-label">Category</InputLabel>
                <Select
                  labelId="category-select-label"
                  id="category-select"
                  value={state.axisOptions.selectedCategory}
                  onChange={handleCategoryChange}
                  label="Category"
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
                <InputLabel id="value-select-label">Value</InputLabel>
                <Select
                  labelId="value-select-label"
                  id="value-select"
                  value={state.axisOptions.selectedValue}
                  onChange={handleValueChange}
                  label="Value"
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
          {state.series.length > 0 ? (
            <Chart
              options={state.options}
              series={state.series}
              type="treemap"
              height="100%"
            />
          ) : (
            <p>No data available for the selected options.</p>
          )}
        </Grid>
      </Grid>
    </>
  );
};

export default TreeMap;
