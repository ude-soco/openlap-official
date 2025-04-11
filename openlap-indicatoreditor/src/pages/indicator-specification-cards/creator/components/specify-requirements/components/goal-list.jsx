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
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { Close as CloseIcon } from "@mui/icons-material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import { v4 as uuidv4 } from "uuid";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestAllGoals } from "../utils/requirements-api.js";
import { useSnackbar } from "notistack";

const filter = createFilterOptions();

const GoalList = () => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const { requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    goalList: [],
    message: "Loading...",
  });

  useEffect(() => {
    const loadGoalList = async (api) => {
      try {
        return await requestAllGoals(api);
      } catch (error) {
        console.log(error);
        enqueueSnackbar(error.message, { variant: "error" });
        setState((prevState) => ({
          ...prevState,
          message: "No goals found",
        }));
      }
    };

    loadGoalList(api).then((response) => {
      if (state.goalList.length === 0) {
        setState((prevState) => ({
          ...prevState,
          goalList: response.sort((a, b) => a.verb.localeCompare(b.verb)),
          message: "I want to",
        }));
      }
    });
  }, []);

  return (
    <>
      <FormControl fullWidth>
        <Autocomplete
          value={requirements.goalType || null}
          selectOnFocus
          disablePortal
          disableClearable
          clearOnBlur
          handleHomeEndKeys
          freeSolo
          options={state.goalList}
          onChange={(event, newValue) => {
            if (newValue === null || newValue === "") {
              // Handle clear action
              setRequirements((prevState) => ({
                ...prevState,
                goalType: {
                  verb: "",
                },
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
                verb: newValue.inputValue,
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
                  a.verb.localeCompare(b.verb)
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
              placeholder={
                state.goalList.length > 0 ? "e.g., monitor" : undefined
              }
              label={state.message}
            />
          )}
          getOptionLabel={(option) => {
            if (typeof option === "string") {
              return option;
            }
            if (option.inputValue) {
              return option.inputValue;
            }
            return option.verb;
          }}
          filterOptions={(options, params) => {
            const filtered = filter(options, params);
            const { inputValue } = params;
            const isExisting = options.some(
              (option) => inputValue === option.verb
            );
            if (inputValue !== "" && !isExisting) {
              filtered.push({
                inputValue,
                verb: `Add "${inputValue}"`,
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
                    <Tooltip
                      arrow
                      title={
                        option.description ? (
                          <Typography variant="body2" sx={{ p: 1 }}>
                            {option.description}
                          </Typography>
                        ) : undefined
                      }
                    >
                      <Typography>{option.verb}</Typography>
                    </Tooltip>
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
                                (goal) => goal.id !== option.id
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
        {requirements.goalType.verb === "" && (
          <FormHelperText sx={{ color: "#b71c1c" }}>
            Select a goal or create a new one
          </FormHelperText>
        )}
      </FormControl>
    </>
  );
};

export default GoalList;
