import {
  Stack,
  Typography,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  Button,
  FormControl,
  TextField,
  Checkbox,
  Box,
  FormGroup,
} from "@mui/material";
import { useContext, useEffect, useState, useRef } from "react";
import ApexCharts from "apexcharts";
import { StateContext } from "../bar-chart";

export const FiltersBar = () => {
  const { state, setState, chartRef } = useContext(StateContext);
  const [checkSeries, setcheckSeries] = useState(
    JSON.parse(localStorage.getItem("checked")) !== null || undefined
      ? JSON.parse(localStorage.getItem("checked"))
      : true
  );
  const [tempcategories, settempcategories] = useState(
    JSON.parse(localStorage.getItem("categories"))?.length > 0
      ? JSON.parse(localStorage.getItem("categories"))
      : state.options.xaxis.categories.map((category) => ({
          name: category,
          checked: true,
        }))
  );
  const [tempSeries, settempSeries] = useState(
    JSON.parse(localStorage.getItem("series"))?.length > 0
      ? JSON.parse(localStorage.getItem("series"))
      : state.series[0].data.map((data) => ({
          name: data,
          checked: true,
        }))
  );
  const [sort, setsort] = useState(localStorage.getItem("sort") || "");
  const [originalState, setOriginalState] = useState(null);
  const [filteredCats, setfilteredCats] = useState([]);
  const [filteredSeries, setfilteredSeries] = useState([]);

  console.log(state);

  // console.log(state);

  useEffect(() => {
    if (checkSeries && state.series[0]) {
      ApexCharts.exec(
        state.options.chart.id,
        "showSeries",
        state.series[0].name
      );
    } else if (!checkSeries && state.series[0]) {
      ApexCharts.exec(
        state.options.chart.id,
        "hideSeries",
        state.series[0]?.name
      );
    }
    // setOriginalState(state);
  }, []);

  function handleSeriesChecked(e) {
    setcheckSeries(e.target.checked);
    localStorage.setItem("checked", JSON.stringify(e.target.checked));
    ApexCharts.exec(
      state.options.chart.id,
      "toggleSeries",
      state.series[0].name
    );
  }

  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(tempcategories));
    localStorage.setItem("series", JSON.stringify(tempSeries));
  }, [tempcategories, tempSeries]);

  function handleCategoryChecked(index) {
    const updatedCategories = tempcategories.map((cat, i) =>
      i === index ? { ...cat, checked: !cat.checked } : cat
    );

    const updatedSeries = tempSeries.map((series, i) =>
      i === index ? { ...series, checked: !series.checked } : series
    );

    settempcategories(updatedCategories);
    settempSeries(updatedSeries);

    const newCategories = updatedCategories
      .filter((cat) => cat.checked === true)
      .map((prevc) => prevc.name);
    const newSeries = updatedSeries
      .filter((series) => series.checked === true)
      .map((prevs) => prevs.name);

    setState((prevState) => ({
      ...prevState,
      series: [
        {
          ...prevState.series[0],
          data: newSeries,
        },
      ],
      options: {
        ...prevState.options,
        xaxis: {
          ...prevState.options.xaxis,
          categories: newCategories,
        },
      },
    }));

    setsort("");
    localStorage.setItem("sort", "");
  }

  function handleSortChange(e, sort) {
    const value = e ? e.target.value : sort;
    setsort(value);
    localStorage.setItem("sort", value);
    if (value === "asc") {
      const combinedArray = state.series[0].data.map((dataPoint, index) => ({
        data: dataPoint,
        category: state.options.xaxis.categories[index],
      }));

      combinedArray.sort((a, b) => a.data - b.data);

      const sortedData = combinedArray.map((item) => item.data);
      const sortedCategories = combinedArray.map((item) => item.category);
      setState((prevState) => ({
        ...prevState,
        series: [
          {
            ...prevState.series[0],
            data: sortedData,
          },
        ],
        options: {
          ...prevState.options,
          xaxis: {
            ...prevState.options.xaxis,
            categories: sortedCategories,
          },
        },
      }));
    } else if (value === "desc") {
      const combinedArray = state.series[0].data.map((dataPoint, index) => ({
        data: dataPoint,
        category: state.options.xaxis.categories[index],
      }));

      combinedArray.sort((a, b) => b.data - a.data);

      const sortedData = combinedArray.map((item) => item.data);
      const sortedCategories = combinedArray.map((item) => item.category);

      setState((prevState) => ({
        ...prevState,
        series: [
          {
            ...prevState.series[0],
            data: sortedData,
          },
        ],
        options: {
          ...prevState.options,
          xaxis: {
            ...prevState.options.xaxis,
            categories: sortedCategories,
          },
        },
      }));
    } else {
      const combinedArray = state.series[0].data.map((dataPoint, index) => ({
        data: dataPoint,
        category: state.options.xaxis.categories[index],
      }));
    }
  }

  return (
    <>
      <Stack>
        <Stack mb={1} spacing={2}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            SERIES FILTER
          </Typography>

          <FormControlLabel
            label={state.series[0]?.name}
            control={
              <Checkbox onChange={handleSeriesChecked} checked={checkSeries} />
            }
          ></FormControlLabel>
        </Stack>

        <Stack mb={1} spacing={2}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            CATEGORIES FILTER
          </Typography>

          {tempcategories.map((cat, index) => (
            <FormControlLabel
              key={index}
              label={cat.name}
              control={
                <Checkbox
                  onChange={() => handleCategoryChecked(index)}
                  checked={cat.checked}
                />
              }
            ></FormControlLabel>
          ))}
        </Stack>

        <Stack mb={1} spacing={1}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            DATA SORTING
          </Typography>
          <FormControl>
            <RadioGroup value={sort} onChange={handleSortChange} row>
              <FormControlLabel
                label="Ascending"
                control={<Radio value="asc" />}
              ></FormControlLabel>
              <FormControlLabel
                label="Descending"
                control={<Radio value="desc" />}
              ></FormControlLabel>
            </RadioGroup>
          </FormControl>
        </Stack>
      </Stack>
    </>
  );
};
