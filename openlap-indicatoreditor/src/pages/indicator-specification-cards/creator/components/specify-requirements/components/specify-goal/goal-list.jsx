import { useContext, useEffect, useState } from "react";
import {
  Autocomplete,
  FormControl,
  IconButton,
  Grid,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { createFilterOptions } from "@mui/material/Autocomplete";
import { v4 as uuidv4 } from "uuid";
import { requestAllGoals } from "../../utils/requirements-api.js";
import { useSnackbar } from "notistack";
import { ISCContext } from "../../../../indicator-specification-card.jsx";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager.jsx";

const filter = createFilterOptions();

const GoalList = () => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const { requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    typedGoal: "",
    goalList: [],
    message: "Loading...",
  });

  useEffect(() => {
    loadGoalList();
  }, []);

  const loadGoalList = async () => {
    try {
      const goalList = await requestAllGoals(api);
      setState((prevState) => ({
        ...prevState,
        goalList: goalList.sort((a, b) => a.verb.localeCompare(b.verb)),
        message: "I want to",
      }));
    } catch (error) {
      console.log(error);
      enqueueSnackbar(error.message, { variant: "error" });
      setState((prevState) => ({
        ...prevState,
        message: "No goals found",
      }));
    }
  };

  const handleOnChange = (_, newValue) => {
    if (newValue === null || newValue === "") {
      setRequirements((p) => ({
        ...p,
        goalType: {
          id: "",
          verb: "",
          category: "",
          description: "",
          custom: false,
          active: true,
        },
      }));
    } else if (typeof newValue === "string") {
      setRequirements((p) => ({ ...p, goalType: newValue }));
    } else if (newValue && newValue.inputValue) {
      // Create a new value from the user input
      let newGoal = { id: uuidv4(), verb: newValue.inputValue, custom: true };
      let tempListOfGoals = [...state.goalList, newGoal].sort((a, b) =>
        a.verb.localeCompare(b.verb)
      );
      setRequirements((p) => ({ ...p, goalType: newGoal }));
      setState((p) => ({ ...p, goalList: tempListOfGoals }));
    } else {
      setRequirements((p) => ({ ...p, goalType: newValue }));
    }
  };

  const handleGetOptionLabel = (option) => {
    if (typeof option === "string") return option;
    if (option.inputValue) return option.inputValue;
    return option.verb;
  };

  const handleFilterOptions = (options, params) => {
    const filtered = filter(options, params);
    const { inputValue } = params;
    const isExisting = options.some((option) => inputValue === option.verb);
    if (inputValue !== "" && !isExisting) {
      filtered.unshift({
        inputValue,
        verb: (
          <span>
            Create goal <b>"{inputValue}"</b>
          </span>
        ),
      });
    }

    return filtered;
  };

  const handleOnClose = () => {
    if (!state.typedGoal) return;
    const alreadySelected =
      typeof requirements.goalType === "object" &&
      requirements.goalType?.verb === state.typedGoal;
    if (!alreadySelected) {
      const existingGoal = state.goalList.find(
        (goal) => goal.verb === state.typedGoal
      );
      if (existingGoal) {
        setRequirements((prev) => ({
          ...prev,
          goalType: existingGoal,
        }));
      } else {
        const newGoal = {
          id: uuidv4(),
          verb: state.typedGoal,
          custom: true,
        };
        setRequirements((prev) => ({
          ...prev,
          goalType: newGoal,
        }));
        setState((prev) => ({
          ...prev,
          goalList: [...prev.goalList, newGoal].sort((a, b) =>
            a.verb.localeCompare(b.verb)
          ),
        }));
      }
    }
  };

  return (
    <>
      <FormControl fullWidth>
        <Autocomplete
          required
          value={requirements.goalType || null}
          selectOnFocus
          disablePortal
          clearOnBlur
          handleHomeEndKeys
          freeSolo
          options={state.goalList}
          onChange={(event, newValue) => handleOnChange(event, newValue)}
          onClose={handleOnClose}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={
                state.goalList.length > 0 ? "Find or create a goal" : undefined
              }
              label={state.message}
              InputProps={{
                ...params.InputProps,
                startAdornment:
                  requirements.goalType || params.inputProps.value ? (
                    <>
                      <SearchIcon sx={{ mr: 1, color: "action.active" }} />
                      {params.InputProps.startAdornment}
                    </>
                  ) : (
                    params.InputProps.startAdornment
                  ),
              }}
            />
          )}
          getOptionLabel={(option) => handleGetOptionLabel(option)}
          filterOptions={(options, params) =>
            handleFilterOptions(options, params)
          }
          renderOption={(props, option) => {
            const { key, ...restProps } = props;
            return (
              <li key={key} {...restProps}>
                <Grid container alignItems="center">
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
              </li>
            );
          }}
        />
      </FormControl>
    </>
  );
};

export default GoalList;
