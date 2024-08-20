import React, { useContext, useEffect, useState } from "react";
import {
  Autocomplete,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import goalList from "../../../../../isc-creator/utils/data/goalList.js";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { Close as CloseIcon } from "@mui/icons-material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import { v4 as uuidv4 } from "uuid";

const filter = createFilterOptions();

const GoalList = () => {
  const { requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    goalList: [],
  });

  useEffect(() => {
    if (state.goalList.length === 0) {
      setState((prevState) => ({
        ...prevState,
        goalList: goalList.sort((a, b) => a.name.localeCompare(b.name)),
      }));
    }
  }, []);

  return (
    <>
      <FormControl fullWidth>
        <Autocomplete
          value={requirements.goalType || null}
          selectOnFocus
          disablePortal
          clearOnBlur
          handleHomeEndKeys
          freeSolo
          options={state.goalList}
          onChange={(event, newValue) => {
            if (newValue === null || newValue === "") {
              // Handle clear action
              setRequirements((prevState) => ({
                ...prevState,
                goalType: null,
              }));
            } else if (typeof newValue === "string") {
              setRequirements((prevState) => ({
                ...prevState,
                goalType: newValue,
              }));
            } else if (newValue && newValue.inputValue) {
              // Create a new value from the user input
              let tempListOfGoals = [...state.goalList];
              let newGoal = {
                id: uuidv4(),
                name: newValue.inputValue,
                custom: true,
              };
              setRequirements((prevState) => ({
                ...prevState,
                goalType: newGoal,
              }));
              tempListOfGoals.push(newGoal);
              setState((prevState) => ({
                ...prevState,
                goalList: tempListOfGoals.sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
              }));
            } else {
              setRequirements((prevState) => ({
                ...prevState,
                goalType: newValue,
              }));
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="e.g., monitor"
              label="I want to"
            />
          )}
          getOptionLabel={(option) => {
            if (typeof option === "string") {
              return option;
            }
            if (option.inputValue) {
              return option.inputValue;
            }
            return option.name;
          }}
          filterOptions={(options, params) => {
            const filtered = filter(options, params);
            const { inputValue } = params;
            const isExisting = options.some(
              (option) => inputValue === option.name,
            );
            if (inputValue !== "" && !isExisting) {
              filtered.push({
                inputValue,
                name: `Add "${inputValue}"`,
              });
            }

            return filtered;
          }}
          renderOption={(props, option) => {
            const { key, ...restProps } = props;
            return (
              <li key={key} {...restProps}>
                <Grid container alignItems="center">
                  <Grid item xs>
                    {option.description ? (
                      <Tooltip
                        arrow
                        placement="right"
                        title={
                          <Typography variant="body2" sx={{ p: 1 }}>
                            {option.description}
                          </Typography>
                        }
                      >
                        <span>{option.name}</span>
                      </Tooltip>
                    ) : (
                      <span>{option.name}</span>
                    )}
                  </Grid>
                  <Grid item>
                    {option.custom && (
                      <Tooltip
                        title={
                          <Typography variant="body2" sx={{ p: 1 }}>
                            Remove custom goal
                          </Typography>
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setState((prevState) => ({
                              goalList: prevState.goalList.filter(
                                (goal) => goal.id !== option.id,
                              ),
                            }));
                          }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Grid>
                </Grid>
              </li>
            );
          }}
        />
        <FormHelperText>Select a goal or create a new one</FormHelperText>
      </FormControl>
    </>
  );
};

export default GoalList;
