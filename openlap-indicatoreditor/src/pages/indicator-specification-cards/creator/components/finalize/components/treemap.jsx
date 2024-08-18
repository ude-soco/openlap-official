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
        height: 350,
        foreColor: darkMode ? "#ffffff" : "#000000",
      },
      title: {
        text: "TreeMap Visualization",
        align: "center",
      },
      legend: {
        show: false,
      },
      tooltip: {
        enabled: true,
        followCursor: true,
        theme: darkMode ? "dark" : "light",
      },
    },
    axisOptions: {
      categoryOptions: [],
      valueOptions: [],
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

      setState((prevState) => ({
        ...prevState,
        axisOptions: {
          categoryOptions: stringColumns,
          valueOptions: numberColumns,
          selectedCategory: stringColumns[0]?.field || "",
          selectedValue: numberColumns[0]?.field || "",
        },
      }));
    }
  }, [dataset, darkMode]);

  useEffect(() => {
    if (dataset && dataset.rows && dataset.columns) {
      const { selectedCategory, selectedValue } = state.axisOptions;

      if (!selectedCategory || !selectedValue) return;

      // Aggregate data for TreeMap
      const aggregateData = dataset.rows.reduce((acc, row) => {
        const category = row[selectedCategory];
        const value = row[selectedValue] || 0;

        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          x: row["481ca5f0-f8fb-484b-aca9-9043758439c3"], // Assuming city name or similar
          y: value,
        });

        return acc;
      }, {});

      // Convert aggregate data to the format required by TreeMap
      const series = Object.entries(aggregateData).map(([category, data]) => ({
        name: category,
        data: data,
      }));

      setState((prevState) => ({
        ...prevState,
        series: series,
        options: {
          ...prevState.options,
          title: {
            text: `TreeMap of ${dataset.columns.find((col) => col.field === selectedCategory)?.headerName} vs ${dataset.columns.find((col) => col.field === selectedValue)?.headerName}`,
          },
        },
      }));
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
                  {state.axisOptions.categoryOptions.map((col) => (
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
                  {state.axisOptions.valueOptions.map((col) => (
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
            type="treemap"
            height="100%"
          />
        </Grid>
      </Grid>
    </>
  );
};

export default TreeMap;
