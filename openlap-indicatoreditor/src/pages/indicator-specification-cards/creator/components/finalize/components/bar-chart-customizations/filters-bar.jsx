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
import { useContext, useEffect, useState } from "react";
import ApexCharts from "apexcharts";
import { StateContext } from "../bar-chart";

export const FiltersBar = () => {
  const { state, setState, chartRef } = useContext(StateContext);
  const [checkSeries, setcheckSeries] = useState(true);
  const [tempcategories, settempcategories] = useState([]);
  const [tempSeries, settempSeries] = useState([]);

  useEffect(() => {
    const newArray = state.options.xaxis.categories.map((category) => ({
      name: category,
      checked: true,
    }));
    settempcategories(newArray);

    const newArray2 = state.series[0].data.map((data) => ({
      name: data,
      checked: true,
    }));
    settempSeries(newArray2);
  }, []);

  function handleSeriesChecked(e) {
    setcheckSeries(e.target.checked);
    ApexCharts.exec(
      state.options.chart.id,
      "toggleSeries",
      state.series[0].name
    );
  }

  useEffect(() => {
    const newCategories = tempcategories
      .filter((cat) => cat.checked === true)
      .map((prevc) => prevc.name);
    const newSeries = tempSeries
      .filter((series) => series.checked === true)
      .map((prevs) => prevs.name);

    const updatedSeries = state.series.map((item, index) =>
      index === 0 ? { ...item, data: newSeries } : item
    );

    setState((prevState) => ({
      ...prevState,
      series: updatedSeries,
      options: {
        ...prevState.options,
        xaxis: {
          ...prevState.options.xaxis,
          categories: newCategories,
        },
      },
    }));
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
  }

  return (
    <>
      <Stack>
        <Stack mb={1} spacing={2}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            SERIES FILTER
          </Typography>

          <FormControlLabel
            label={state.series[0].name}
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
      </Stack>
    </>
  );
};
