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
import { StateContext } from "../grouped-bar-chart";
import { ChartType } from "../line-chart-customization/line-chart-customization";

// TODO: Recheck this component
export const FiltersLine = () => {
  const { state, setState, chartRef } = useContext(StateContext);
  const [tempSeries, settempSeries] = useState(
    JSON.parse(localStorage.getItem("series"))?.length > 0
      ? JSON.parse(localStorage.getItem("series"))
      : state.series.map((data) => ({
          data: data,
          checked: true,
        }))
  );
  const [tempcategories, settempcategories] = useState(
    JSON.parse(localStorage.getItem("categories"))?.length > 0
      ? JSON.parse(localStorage.getItem("categories"))
      : state.options.xaxis.categories.map((category) => ({
          name: category,
          checked: true,
        }))
  );

  const [newSeries, setnewSeries] = useState(
    tempSeries
      .filter((series) => series.checked === true)
      .map((prevs) => prevs.data)
  );
  const [count, setcount] = useState(tempcategories.length);

  useEffect(() => {
    tempSeries.forEach((series, index) => {
      if (series.checked) {
        ApexCharts.exec(state.options.chart.id, "showSeries", series.data.name);
      } else {
        ApexCharts.exec(state.options.chart.id, "hideSeries", series.data.name);
      }
    });
  }, [tempSeries, newSeries]);

  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(tempcategories));
    localStorage.setItem("series", JSON.stringify(tempSeries));
  }, [tempcategories, tempSeries]);

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container sx={{ mt: 1 }}>
            <FormControl>
              <Autocomplete
                multiple
                disableCloseOnSelect
                disableClearable
                options={tempSeries}
                getOptionLabel={(option) => option.data.name}
                value={tempSeries.filter((series) => series.checked)}
                onChange={(event, newValue) => {
                  const updatedSeries = tempSeries.map((series) => ({
                    ...series,
                    checked: newValue.some(
                      (val) => val.data.name === series.data.name
                    ),
                  }));
                  settempSeries(updatedSeries);
                  const newSeries = updatedSeries
                    .filter((series) => series.checked === true)
                    .map((prevs) => prevs.data);
                  setnewSeries(newSeries);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Series Filter"
                    placeholder="Select series"
                  />
                )}
                renderOption={(props, option, { selected }) => (
                  <li
                    {...props}
                    key={option.data.name}
                    style={{
                      pointerEvents:
                        newSeries.length === 1 && selected ? "none" : "auto",
                    }}
                  >
                    <Checkbox
                      checked={selected}
                      key={option.name}
                      disabled={newSeries.length === 1 && selected}
                      style={{ marginRight: 8 }}
                    />
                    {option.data.name}
                  </li>
                )}
                renderTags={(tagValue, getTagProps) =>
                  tagValue.map((option, index) => (
                    <Chip
                      key={option.data.name}
                      label={option.data.name}
                      {...getTagProps({ index })}
                      disabled={newSeries.length === 1}
                    />
                  ))
                }
              />
            </FormControl>
          </Grid>
        </Grid>

        {state.options.chart.type === ChartType.GROUPED_BAR && (
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
                        pointerEvents:
                          count === 1 && selected ? "none" : "auto",
                      }}
                    >
                      <Checkbox
                        checked={selected}
                        key={option.name}
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
        )}
      </Grid>
    </>
  );
};
