import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  Grid,
  TextField,
} from "@mui/material";

const FiltersTab = ({ state, setState }) => {
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
      : state.series.map((data) => ({
          data: data,
          checked: true,
        }))
  );
  const [sort, setsort] = useState(localStorage.getItem("sort") || "");
  const [count, setcount] = useState(tempcategories.length);

  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(tempcategories));
    localStorage.setItem("series", JSON.stringify(tempSeries));
  }, [tempcategories, tempSeries]);

  const handleSortChange = (e, sort) => {
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
    }
  };

  return (
    <>
      <Grid item xs={12}>
        {state.configuration.isCategoriesFilteringAvailable && (
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
                  setsort("");
                  localStorage.setItem("sort", "");
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
        )}

        {state.configuration.isSortingOrderChangeable && (
          <Grid item xs={12} mt={2}>
            <FormControl>
              <FormLabel id="role-label">Data Sorting</FormLabel>
              <FormControl>
                <RadioGroup value={sort} onChange={handleSortChange} row>
                  {state.configuration.isSortingOrderAscendingAvailable && (
                    <FormControlLabel
                      label="Ascending"
                      control={<Radio value="asc" />}
                    ></FormControlLabel>
                  )}
                  {state.configuration.isSortingOrderDescendingAvailable && (
                    <FormControlLabel
                      label="Descending"
                      control={<Radio value="desc" />}
                    ></FormControlLabel>
                  )}
                </RadioGroup>
              </FormControl>
            </FormControl>
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default FiltersTab;
