import { useEffect, useState } from "react";
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

export const FiltersBar = ({
  categories,
  state,
  setState,
  chartConfiguration,
}) => {
  const [tempcategories, settempcategories] = useState(
    JSON.parse(localStorage.getItem("basic_indic_cats"))?.length > 0
      ? JSON.parse(localStorage.getItem("basic_indic_cats"))
      : categories.map((category) => ({
          name: category,
          checked: true,
        }))
  );
  const [count, setcount] = useState(tempcategories.length);

  useEffect(() => {
    localStorage.setItem("basic_indic_cats", JSON.stringify(tempcategories));
  }, [tempcategories]);

  const pushtoHiddenCategoriesIndexes = (index) => {
    setState((prevState) => ({
      ...prevState,
      edited: true,
      hiddenCategoriesIndexes:
        prevState.hiddenCategoriesIndexes.length === 0
          ? [index.toString()]
          : prevState.hiddenCategoriesIndexes.length !== 0 &&
            prevState.hiddenCategoriesIndexes.includes(index.toString())
          ? prevState.hiddenCategoriesIndexes.filter(
              (i) => i !== index.toString()
            )
          : [...prevState.hiddenCategoriesIndexes, index.toString()],
    }));
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    setState((prevState) => ({
      ...prevState,
      sortingOrder: value,
      edited: true,
    }));
  };

  return (
    <>
      <Grid item xs={12}>
        <Grid container sx={{ mt: 1 }}>
          {chartConfiguration.categoriesFilteringAvailable && (
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
                  const updatedCategories = tempcategories.map((cat, index) => {
                    const isChecked = newValue.some(
                      (selected) => selected.name === cat.name
                    );
                    if (isChecked && !cat.checked) {
                      pushtoHiddenCategoriesIndexes(index);
                    } else if (!isChecked && cat.checked) {
                      pushtoHiddenCategoriesIndexes(index);
                    }
                    return {
                      ...cat,
                      checked: isChecked,
                    };
                  });

                  const checkedCount = updatedCategories.filter(
                    (item) => item.checked
                  ).length;

                  setcount(checkedCount);
                  settempcategories(updatedCategories);
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
          )}
        </Grid>

        {chartConfiguration.sortingOrderChangeable && (
          <Grid item xs={12} mt={2}>
            <FormControl>
              <FormLabel id="role-label">Data Sorting</FormLabel>
              <FormControl>
                <RadioGroup
                  value={state.sortingOrder}
                  onChange={handleSortChange}
                  row
                >
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
            </FormControl>
          </Grid>
        )}
      </Grid>
    </>
  );
};
