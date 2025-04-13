import React, {
  useContext,
  useEffect,
  useState,
  createContext,
  useRef,
} from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import Chart from "react-apexcharts";
import {
  Button,
  FormControl,
  FormHelperText,
  Grow,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { LinechartCustomization } from "./line-chart-customization/line-chart-customization.jsx";
import Grid from "@mui/material/Grid2";
import PaletteIcon from "@mui/icons-material/Palette";
import CloseIcon from "@mui/icons-material/Close";

export let StateContext = createContext();

const GroupedBarChart = ({
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
        id: visRef.chart.code,
        type: visRef.chart.code,
        stacked: false,
        width: "100%",
        foreColor: darkMode ? "#ffffff" : "#000000",
        toolbar: {
          show: false,
          autoSelected: "zoom",
        },
      },
      colors: [],
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
          grouped: true,
          dataLabels: {
            position: "center",
          },
        },
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
      xaxis: {
        categories: [],
        name: "",
        title: {
          text: "",
          style: {
            cssClass: "x-y-axis-show-title",
          },
        },
        labels: {
          show: true,
        },
      },
      yaxis: {
        title: {
          text: "",
          style: {
            cssClass: "x-y-axis-show-title",
          },
        },
        labels: {
          show: true,
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
        (col) => col.type === "string"
      );
      const numberColumns = dataset.columns.filter(
        (col) => col.type === "number"
      );

      // Update selected X and Y axes
      const updatedSelectedXAxis = state.axisOptions.selectedXAxis
        ? stringColumns.find(
            (col) => col.field === state.axisOptions.selectedXAxis
          )?.field || ""
        : stringColumns.length > 0
        ? stringColumns[0].field
        : "";

      const updatedSelectedYAxes = state.axisOptions.selectedYAxes.filter(
        (field) => numberColumns.find((col) => col.field === field)
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
    if (dataset && dataset.rows && dataset.columns && !preview) {
      const { selectedXAxis, selectedYAxes } = state.axisOptions;
      const categoryColumn = dataset.columns.find(
        (col) => col.field === selectedXAxis
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

  const handleYAxesChange = (event) => {
    const { value } = event.target;
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedYAxes: typeof value === "string" ? value.split(",") : value,
      },
    }));
    localStorage.removeItem("series");
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
                          (col) => col.field === value
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
              <LinechartCustomization />
            </StateContext.Provider>
          </Grid>
        </Grow>
      </Grid>
    </>
  );
};

export default GroupedBarChart;
