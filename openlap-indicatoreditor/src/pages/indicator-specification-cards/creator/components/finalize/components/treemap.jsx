import { useContext, useEffect, useRef, useState } from "react";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";
import {
  Button,
  FormControl,
  Grow,
  Grid,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import Chart from "react-apexcharts";
import PaletteIcon from "@mui/icons-material/Palette";
import CloseIcon from "@mui/icons-material/Close";
import CustomizationPanel from "./customization-panel/customization-panel.jsx";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { DataTypes } from "../../../utils/data/config.js";
import ChartAxisDropdownFeedback from "./chart-axis-dropdown-feedback.jsx";

const TreeMap = ({ customize = false, handleToggleCustomizePanel }) => {
  const { darkMode } = useContext(CustomThemeContext);
  const { visRef, setVisRef, dataset } = useContext(ISCContext);
  const chartRef = useRef(null);

  const [state, setState] = useState({
    series: [],
    configuration: {
      isShowHideLegendAvailable: true,
      isLegendPositionChangeable: true,
      isLegendPositionBottomAvailable: true,
      isLegendPositionTopAvailable: true,
      isLegendPositionLeftAvailable: true,
      isLegendPositionRightAvailable: true,
      isShowHideAxesAvailable: false,
      isShowHideXAxisAvailable: false,
      isShowHideYAxisAvailable: false,
      isChartTitleAvailable: true,
      isChartSubtitleAvailable: true,
      isTitleAndSubtitlePositionChangeable: true,
      isTitleAndSubtitlePositionCenterAvailable: true,
      isTitleAndSubtitlePositionLeftAvailable: true,
      isTitleAndSubtitlePositionRightAvailable: true,
      isShowHideLabelsAvailable: true,
      isShowHideLabelsBackgroundAvailable: false,
      isLabelsPositionChangeable: false,
      isLabelsPositionTopAvailable: false,
      isLabelsPositionCenterAvailable: false,
      isSeriesColorChangeable: true,
      isSeriesSingleColor: false,
      isSeriesMultipleColor: true,
      isSortingOrderChangeable: false,
      isLegendTextColorAvailable: true,
      isDataLabelsColorAvailable: true,
      isDataLabelsWithBackgroundColorAvailable: false,
      isShowHideXAxisTitleAvailable: false,
      isShowHideYAxisTitleAvailable: false,
      isShowHideAxesTitleAvailable: false,
      isSortingOrderAscendingAvailable: false,
      isSortingOrderDescendingAvailable: false,
      isCategoriesFilteringAvailable: false,
    },
    options: visRef.edit
      ? visRef.data.options
      : {
          chart: {
            type: "treemap",
            id: "treemap",
            height: 350,
            foreColor: darkMode ? "#ffffff" : "#000000",
            toolbar: {
              show: false,
            },
          },
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
          dataLabels: {
            enabled: true,
            style: {
              colors: ["#000000"],
              fontWeight: 400,
            },
            background: {
              enabled: true,
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
          },
        },
    axisOptions: {
      categoryOptions: [],
      xValueOptions: [],
      valueOptions: [],
      selectedXValue: "",
      selectedCategory: "",
      selectedValue: "",
      categoryType: DataTypes.categorical,
      xValueType: DataTypes.categorical,
      valueType: DataTypes.numerical,
    },
  });

  // * This effect is used to update the chart when the dark mode changes.
  useEffect(() => {
    setState((prevState) => ({
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
    }));
  }, [darkMode]);

  useEffect(() => {
    const stringColumns = dataset.columns.filter(
      (col) => col.type === "string"
    );
    const numberColumns = dataset.columns.filter(
      (col) => col.type === "number"
    );
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        categoryOptions: stringColumns,
        xValueOptions: stringColumns,
        valueOptions: numberColumns,
      },
    }));
    setVisRef((prevVisRef) => ({
      ...prevVisRef,
      data: {
        ...prevVisRef.data,
        axisOptions: {
          ...prevVisRef.data.axisOptions,
          xValueOptions: stringColumns,
          categoryOptions: stringColumns,
          valueOptions: numberColumns,
        },
      },
      edit: false,
    }));
  }, [dataset]);

  useEffect(() => {
    const selectedXValue =
      visRef.data.axisOptions.selectedXValue ||
      state.axisOptions.selectedXValue;
    const selectedCategory =
      visRef.data.axisOptions.selectedCategory ||
      state.axisOptions.selectedCategory;
    const selectedValue =
      visRef.data.axisOptions.selectedValue || state.axisOptions.selectedValue;
    const stringColumns =
      visRef.data.axisOptions.xValueOptions || state.axisOptions.xValueOptions;
    const numberColumns =
      visRef.data.axisOptions.valueOptions || state.axisOptions.valueOptions;

    let updatedSelectedXValue = "";
    if (visRef.edit && selectedXValue.length !== 0)
      updatedSelectedXValue = selectedXValue;
    else if (selectedXValue.length !== 0)
      updatedSelectedXValue =
        stringColumns.find((col) => col.field === selectedXValue)?.field ||
        (stringColumns.length > 0 ? stringColumns[0].field : "");
    else
      updatedSelectedXValue =
        stringColumns.length > 0 ? stringColumns[0].field : "";

    let updatedSelectedValue = "";
    if (visRef.edit && selectedValue.length !== 0)
      updatedSelectedValue = selectedValue;
    else if (selectedValue.length !== 0)
      updatedSelectedValue =
        numberColumns.find((col) => col.field === selectedValue)?.field ||
        (numberColumns.length > 0
          ? numberColumns[1]?.field || ""
          : numberColumns[0]?.field || "");
    else
      updatedSelectedValue =
        numberColumns.length > 0 ? numberColumns[0].field : "";

    let updatedSelectedCategory = "";
    if (visRef.edit && selectedCategory.length !== 0)
      updatedSelectedCategory = selectedCategory;
    else if (selectedCategory.length !== 0)
      updatedSelectedCategory =
        stringColumns.find((col) => col.field === selectedCategory)?.field ||
        (stringColumns.length > 0 ? stringColumns[0].field : "");
    else
      updatedSelectedCategory =
        stringColumns.length > 0
          ? stringColumns[1]?.field || ""
          : stringColumns[0]?.field || "";

    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedXValue: updatedSelectedXValue,
        selectedCategory: updatedSelectedCategory,
        selectedValue: updatedSelectedValue,
      },
    }));
  }, [
    visRef.data.axisOptions.xValueOptions,
    visRef.data.axisOptions.categoryOptions,
    visRef.data.axisOptions.valueOptions,
  ]);

  useEffect(() => {
    const { selectedCategory, selectedXValue, selectedValue } =
      state.axisOptions;
    const categoryColumn = dataset.columns.find(
      (col) => col.field === selectedCategory
    );
    const valueColumn = dataset.columns.find(
      (col) => col.field === selectedValue
    );
    const xAxisColumn = dataset.columns.find(
      (col) => col.field === selectedXValue
    );
    if (!categoryColumn || !valueColumn || !xAxisColumn) return;

    // * Aggregating data for TreeMap
    const aggregateData = dataset.rows.reduce((acc, row) => {
      const category = row[selectedCategory];
      const xValue = row[selectedXValue];
      const value = row[selectedValue] || 0;
      if (!acc[category]) acc[category] = [];
      // * Finding if xValue already exists
      const existing = acc[category].find((item) => item.x === xValue);
      if (existing) {
        existing.y += value; // * Sum the values
      } else {
        acc[category].push({
          x: xValue,
          y: value,
        });
      }
      return acc;
    }, {});

    // * Converting aggregate data to the format required by TreeMap
    const series = Object.entries(aggregateData).map(([category, data]) => ({
      name: category,
      data: data,
    }));

    setState((prevState) => {
      let tempState = {
        ...prevState,
        series: series,
      };
      setVisRef((prevVisRef) => ({
        ...prevVisRef,
        data: {
          ...prevVisRef.data,
          series: tempState.series,
          options: tempState.options,
          axisOptions: {
            ...prevVisRef.data.axisOptions,
            selectedCategory: state.axisOptions.selectedCategory,
            selectedXValue: state.axisOptions.selectedXValue,
            selectedValue: state.axisOptions.selectedValue,
          },
        },
      }));
      return tempState;
    });
  }, [
    dataset,
    state.axisOptions.selectedCategory,
    state.axisOptions.selectedXValue,
    state.axisOptions.selectedValue,
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

  const handleXValueChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      axisOptions: {
        ...prevState.axisOptions,
        selectedXValue: event.target.value,
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
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl
            fullWidth
            error={state.axisOptions.selectedCategory?.length === 0}
          >
            <InputLabel id="category-select-label">Category</InputLabel>
            <Select
              labelId="category-select-label"
              id="category-select"
              value={state.axisOptions.selectedCategory}
              onChange={handleCategoryChange}
              label="Category"
              variant="outlined"
            >
              <ListSubheader>
                {state.axisOptions.categoryOptions.length === 0
                  ? `No ${state.axisOptions.categoryType.value} column created yet!`
                  : `${state.axisOptions.categoryType.value} column(s)`}
              </ListSubheader>
              {state.axisOptions.categoryOptions.map((col) => (
                <MenuItem key={col.field} value={col.field}>
                  {col.headerName}
                </MenuItem>
              ))}
            </Select>
            {state.axisOptions.selectedCategory?.length === 0 && (
              <ChartAxisDropdownFeedback
                axisName="Categories"
                columnTypeValue={state.axisOptions.categoryType.value}
              />
            )}
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl
            fullWidth
            error={state.axisOptions.selectedXValue?.length === 0}
          >
            <InputLabel id="x-value-select-label">X-Value</InputLabel>
            <Select
              labelId="x-value-select-label"
              id="x-value-select"
              value={state.axisOptions.selectedXValue}
              onChange={handleXValueChange}
              label="X-Value"
              variant="outlined"
            >
              <ListSubheader>
                {state.axisOptions.xValueOptions.length === 0
                  ? `No ${state.axisOptions.xValueType.value} column created yet!`
                  : `${state.axisOptions.xValueType.value} column(s)`}
              </ListSubheader>
              {state.axisOptions.xValueOptions.map((col) => (
                <MenuItem key={col.field} value={col.field}>
                  {col.headerName}
                </MenuItem>
              ))}
            </Select>
            {state.axisOptions.selectedXValue.length === 0 && (
              <ChartAxisDropdownFeedback
                axisName="Categories"
                columnTypeValue={state.axisOptions.xValueType.value}
              />
            )}
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl
            fullWidth
            error={state.axisOptions.selectedValue.length === 0}
          >
            <InputLabel id="value-select-label">Value</InputLabel>
            <Select
              labelId="value-select-label"
              id="value-select"
              value={state.axisOptions.selectedValue}
              onChange={handleValueChange}
              label="Value"
              variant="outlined"
            >
              <ListSubheader>
                {state.axisOptions.valueOptions.length === 0
                  ? `No ${state.axisOptions.valueType.value} column created yet!`
                  : `${state.axisOptions.valueType.value} column(s)`}
              </ListSubheader>
              {state.axisOptions.valueOptions.map((col) => (
                <MenuItem key={col.field} value={col.field}>
                  {col.headerName}
                </MenuItem>
              ))}
            </Select>

            {state.axisOptions.selectedValue.length === 0 && (
              <ChartAxisDropdownFeedback
                axisName="Categories"
                columnTypeValue={state.axisOptions.valueType.value}
              />
            )}
          </FormControl>
        </Grid>
        {!customize && (
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2} justifyContent="flex-end">
              <Button
                startIcon={<PaletteIcon />}
                variant="contained"
                onClick={handleToggleCustomizePanel}
              >
                Customize
              </Button>
            </Grid>
          </Grid>
        )}

        <Grow in={!customize} timeout={{ enter: 500, exit: 0 }} unmountOnExit>
          <Grid size={{ xs: 12 }} sx={{ minHeight: 600 }}>
            {state.series.length > 0 ? (
              <Chart
                ref={chartRef}
                options={state.options}
                series={state.series}
                type="treemap"
                height="100%"
              />
            ) : (
              <Skeleton />
            )}
          </Grid>
        </Grow>

        <Grow in={customize} timeout={{ enter: 500, exit: 0 }} unmountOnExit>
          <Grid size={{ xs: 12, md: 8 }} sx={{ minHeight: 600 }}>
            {state.series.length > 0 ? (
              <Chart
                ref={chartRef}
                options={state.options}
                series={state.series}
                type="treemap"
                height="100%"
              />
            ) : (
              <Skeleton />
            )}
          </Grid>
        </Grow>
        <Grow in={customize} timeout={{ enter: 500, exit: 0 }} unmountOnExit>
          <Grid size={{ xs: 12, md: 4 }} sx={{ minHeight: 600 }}>
            <Grid
              container
              spacing={2}
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography>Customization panel</Typography>
              <Tooltip title="Close">
                <IconButton onClick={handleToggleCustomizePanel}>
                  <CloseIcon color="primary" />
                </IconButton>
              </Tooltip>
            </Grid>
            <CustomizationPanel state={state} setState={setState} />
          </Grid>
        </Grow>
      </Grid>
    </>
  );
};

export default TreeMap;
