import {
  Autocomplete,
  Checkbox,
  Chip,
  FormControl,
  Grid,
  TextField,
} from "@mui/material";
import { useContext, useEffect, useState } from "react";
import ApexCharts from "apexcharts";
import { StateContext } from "../stacked-bar-chart";

export const FilterStacked = () => {
  const { state, setState, chartRef } = useContext(StateContext);
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
      : state.series.map((data) => ({
          data: data,
          checked: true,
        }))
  );

  const [count, setcount] = useState(tempcategories.length);

  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(tempcategories));
    localStorage.setItem("series", JSON.stringify(tempSeries));
  }, [tempcategories, tempSeries]);

  return (
    <>
      <Grid item xs={12}>
        <Grid container sx={{ mt: 1 }}>
          <FormControl>
            <Autocomplete
              multiple
              disableCloseOnSelect
              disableClearable
              limitTags={2}
              options={tempcategories}
              getOptionLabel={(option) => option.name}
              value={tempcategories.filter((cat) => cat.checked)}
              onChange={(event, newValue) => {
                const updatedCategories = tempcategories.map((cat) => ({
                  ...cat,
                  checked: newValue.some(
                    (selected) => selected.name === cat.name
                  ),
                }));

                const checkedCount = updatedCategories.filter(
                  (item) => item.checked
                ).length;

                setcount(checkedCount);
                settempcategories(updatedCategories);

                const newCategories = updatedCategories
                  .filter((cat) => cat.checked === true)
                  .map((prevc) => prevc.name);
                const newSeries = tempSeries.map((item) => ({
                  ...item.data,
                  data: item.data.data.filter(
                    (value, index) => updatedCategories[index].checked
                  ),
                }));

                setState((prevState) => ({
                  ...prevState,
                  series: newSeries,
                  options: {
                    ...prevState.options,
                    xaxis: {
                      ...prevState.options.xaxis,
                      categories: newCategories,
                    },
                  },
                }));
              }}
              renderOption={(props, option, { selected }) => (
                <li
                  {...props}
                  key={option.name}
                  style={{
                    pointerEvents: count === 1 && selected ? "none" : "auto",
                  }}
                >
                  <Checkbox
                    key={option.name}
                    checked={selected}
                    disabled={count === 1 && selected}
                    style={{ marginRight: 8 }}
                  />
                  {option.name}
                </li>
              )}
              renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => (
                  <Chip
                    key={option.name}
                    label={option.name}
                    {...getTagProps({ index })}
                    disabled={count === 1}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Categories Filter" />
              )}
            />
          </FormControl>
        </Grid>
      </Grid>
    </>
  );
};
