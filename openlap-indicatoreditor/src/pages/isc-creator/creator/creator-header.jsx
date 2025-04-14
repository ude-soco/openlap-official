import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  RestartAlt as RestartAltIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import goalList from "../utils/data/goalList.js";
import { useSnackbar } from "notistack";

const filter = createFilterOptions();

const CreatorHeader = ({
  chartSelected,
  dataState,
  handleResetIndicator,
  toggleUserCreatesIndicator,
  userCreatesIndicator,
}) => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  function sortGoalList(goalList) {
    return goalList.sort((a, b) => {
      const nameA = a.name.toUpperCase(); // ignore case
      const nameB = b.name.toUpperCase(); // ignore case
      if (nameA < nameB) {
        return -1; // nameA comes before nameB
      }
      if (nameA > nameB) {
        return 1; // nameB comes before nameA
      }
      return 0; // names are equal
    });
  }

  function deleteObjectByIndex(array, index) {
    if (index >= 0 && index < array.length) {
      array.splice(index, 1);
    }
  }

  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);
  const lowercaseFirstLetter = (str) =>
    str.charAt(0).toLowerCase() + str.slice(1);

  const [indicatorGoal, setIndicatorGoal] = useState(
    JSON.parse(sessionStorage.getItem("openlap-isc-data"))?.indicatorGoal ||
      null
  );

  const [listOfGoals, setListOfGoals] = useState(sortGoalList(goalList));
  const [indicatorGoalText, setIndicatorGoalText] = useState(
    JSON.parse(sessionStorage.getItem("openlap-isc-data"))?.indicatorGoalText ||
      ""
  );
  const [indicatorQuestion, setIndicatorQuestion] = useState(() => {
    let name = JSON.parse(
      sessionStorage.getItem("openlap-isc-data")
    )?.indicatorQuestion;
    if (name) {
      return lowercaseFirstLetter(name);
    } else {
      return "";
    }
  });
  const [indicatorName, setIndicatorName] = useState(() => {
    let name = JSON.parse(
      sessionStorage.getItem("openlap-isc-data")
    )?.indicatorName;
    if (name) {
      return lowercaseFirstLetter(name);
    } else {
      return "";
    }
  });
  const [indicatorDataArray, setIndicatorDataArray] = useState(
    JSON.parse(sessionStorage.getItem("openlap-isc-data"))
      ?.indicatorDataArray || [
      { value: "", placeholder: "e.g., the number of views" },
      { value: "", placeholder: "e.g., name of materials" },
    ]
  );

  const [deleteDialog, setDeleteDialog] = useState(false);

  useEffect(() => {
    let openlapISCData = JSON.parse(sessionStorage.getItem("openlap-isc-data"));
    const updateSessionStorage = () => {
      let tempISCData = {
        ...openlapISCData,
        indicatorGoal: indicatorGoal,
        indicatorGoalText: indicatorGoalText,
        indicatorName: capitalizeFirstLetter(indicatorName),
        indicatorQuestion: capitalizeFirstLetter(indicatorQuestion),
        indicatorDataArray: indicatorDataArray,
      };
      setIndicatorGoalText(lowercaseFirstLetter(tempISCData.indicatorGoalText));
      setIndicatorName(lowercaseFirstLetter(tempISCData.indicatorName));
      setIndicatorQuestion(lowercaseFirstLetter(tempISCData.indicatorQuestion));
      setIndicatorGoal(tempISCData.indicatorGoal);
      setIndicatorDataArray(tempISCData.indicatorDataArray);
      sessionStorage.setItem("openlap-isc-data", JSON.stringify(tempISCData));
    };
    const timer = setTimeout(updateSessionStorage, 500);
    return () => clearTimeout(timer);
  }, [
    indicatorName,
    indicatorGoal,
    indicatorGoalText,
    indicatorQuestion,
    indicatorDataArray,
  ]);

  const handleIndicatorGoalText = (event) => {
    setIndicatorGoalText(event.target.value);
  };
  const handleIndicatorName = (event) => {
    setIndicatorName(event.target.value);
  };
  const handleIndicatorQuestion = (event) => {
    setIndicatorQuestion(event.target.value);
  };
  const handleTextFieldChange = (index, newValue) => {
    setIndicatorDataArray((prevArray) => {
      const newArray = [...prevArray];
      newArray[index].value = newValue;
      return newArray;
    });
  };

  const addNewTextField = () => {
    setIndicatorDataArray((prevArray) => [
      ...prevArray,
      { value: "", placeholder: "e.g., number of downloads" },
    ]);
  };

  const deleteTextField = (index) => {
    setIndicatorDataArray((prevArray) => {
      const newArray = [...prevArray];
      deleteObjectByIndex(newArray, index);
      return newArray;
    });
  };

  const saveIndicator = () => {
    enqueueSnackbar("Indicator saved successfully", {
      variant: "success",
    });
    let currentISC = JSON.parse(sessionStorage.getItem("openlap-isc-data"));
    let currentISCSeries =
      JSON.parse(sessionStorage.getItem("chart-series")) || {};
    let currentISCOptions =
      JSON.parse(sessionStorage.getItem("chart-options")) || {};
    let listOfISCs =
      JSON.parse(localStorage.getItem("openlap-isc-dashboard")) || [];
    listOfISCs = listOfISCs.map((item) => {
      if (item.id === currentISC.id) {
        return {
          ...item,
          chartName: currentISC.chartType.name,
          chartOptions: currentISCOptions,
          chartType: currentISC.chartType,
          chartSeries: currentISCSeries,
          indicatorData: currentISC.indicatorData,
          indicatorGoal: currentISC.indicatorGoal,
          indicatorGoalText: currentISC.indicatorGoalText,
          indicatorName: currentISC.indicatorName,
          indicatorQuestion: currentISC.indicatorQuestion,
          indicatorDataArray: currentISC.indicatorDataArray,
          lastUpdated: new Date(),
        };
      }
      return item;
    });

    if (!listOfISCs.some((item) => item.id === currentISC.id)) {
      listOfISCs.push({
        chartName: currentISC.chartType.name,
        chartOptions: currentISCOptions,
        chartSeries: currentISCSeries,
        chartType: currentISC.chartType,
        id: uuidv4(),
        indicatorData: currentISC.indicatorData,
        indicatorGoal: currentISC.indicatorGoal,
        indicatorGoalText: currentISC.indicatorGoalText,
        indicatorName: currentISC.indicatorName,
        indicatorQuestion: currentISC.indicatorQuestion,
        indicatorDataArray: currentISC.indicatorDataArray,
        lastUpdated: new Date(),
      });
    }

    localStorage.setItem("openlap-isc-dashboard", JSON.stringify(listOfISCs));
    sessionStorage.removeItem("chart-options");
    sessionStorage.removeItem("chart-series");
    sessionStorage.removeItem("openlap-isc-data");
    navigate("/isc");
  };

  const discardChanges = () => {
    handleResetIndicator();
    setIndicatorGoalText("");
    setIndicatorName("");
    setIndicatorQuestion("");
    setIndicatorDataArray([
      { value: "", placeholder: "e.g., the number of views" },
      { value: "", placeholder: "e.g., name of materials" },
    ]);
    setIndicatorGoal(null);
    setDeleteDialog(false);
    toggleUserCreatesIndicator("reset");
  };

  return (
    <>
      <Grid
        container
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
      >
        <Grid item xs={12} sx={{ mb: 2 }}>
          <Grid container justifyContent="flex-end" alignItems="center">
            <Grid item>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Tooltip
                    title={
                      <Typography variant="body2" sx={{ p: 1 }}>
                        Reset progress
                      </Typography>
                    }
                  >
                    <IconButton
                      disabled={
                        indicatorName === "" ||
                        indicatorQuestion === "" ||
                        indicatorGoalText == "" ||
                        indicatorDataArray.some((item) => item.value === "")
                      }
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog(true)}
                    >
                      <RestartAltIcon />
                    </IconButton>
                  </Tooltip>
                  <Dialog open={deleteDialog} fullWidth maxWidth="sm">
                    <DialogTitle>
                      Are you sure you want to reset all your progress?
                    </DialogTitle>
                    <DialogContent>
                      <Typography gutterBottom>
                        Resetting your progress will undo all the work you've
                        done so far, including:
                      </Typography>
                      <Typography gutterBottom>
                        <li>Your set goal for this indicator</li>
                        <li>Any formulated questions and their details</li>
                        <li>The specified name of the indicator</li>
                        <li>Uploaded or created datasets</li>
                        <li>Selected visualizations and any customization</li>
                      </Typography>
                      <Typography gutterBottom>
                        This action cannot be undone, and you will need to start
                        from scratch. Please make sure you want to proceed with
                        this reset.
                      </Typography>
                      <Typography gutterBottom>
                        If you are certain about resetting your progress, please
                        click the "Reset" button below. Otherwise, click
                        "Cancel" to keep your current progress.
                      </Typography>
                    </DialogContent>
                    <DialogActions>
                      <Button
                        fullWidth
                        color="primary"
                        onClick={() => setDeleteDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        fullWidth
                        onClick={discardChanges}
                        variant="contained"
                        color="error"
                      >
                        Reset
                      </Button>
                    </DialogActions>
                  </Dialog>
                </Grid>
                <Grid item>
                  <Tooltip
                    arrow
                    title={
                      <Typography variant="body2" sx={{ p: 1 }}>
                        Save indicator and preview in dashboard
                      </Typography>
                    }
                  >
                    <Button
                      disabled={
                        indicatorName === "" ||
                        indicatorQuestion === "" ||
                        indicatorGoalText == "" ||
                        indicatorDataArray.some((item) => item.value === "") ||
                        chartSelected.code === "" ||
                        dataState.rowData.length === 0
                      }
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={saveIndicator}
                    >
                      Save
                    </Button>
                  </Tooltip>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid
          container
          direction="column"
          spacing={2}
          justifyContent="center"
          sx={{ pl: 1 }}
        >
          {/* Formulating goal */}
          <Grid item xs={12}>
            <Grid container alignItems="center" spacing={1}>
              <Grid item>
                <Typography>I want to</Typography>
              </Grid>
              <Grid item xs sm={3} md={2}>
                <Autocomplete
                  size="small"
                  value={indicatorGoal}
                  onChange={(event, newValue) => {
                    if (typeof newValue === "string") {
                      setIndicatorGoal({
                        name: newValue,
                      });
                    } else if (newValue && newValue.inputValue) {
                      // Create a new value from the user input
                      let tempListOfGoals = [...listOfGoals];
                      let newGoal = {
                        id: uuidv4(),
                        name: newValue.inputValue,
                        custom: true,
                      };
                      tempListOfGoals.push(newGoal);
                      setIndicatorGoal(newGoal);
                      setListOfGoals(sortGoalList(tempListOfGoals));
                    } else {
                      setIndicatorGoal(newValue);
                    }
                  }}
                  filterOptions={(options, params) => {
                    const filtered = filter(options, params);

                    const { inputValue } = params;
                    // Suggest the creation of a new value
                    const isExisting = options.some(
                      (option) => inputValue === option.name
                    );
                    if (inputValue !== "" && !isExisting) {
                      filtered.push({
                        inputValue,
                        name: `Add "${inputValue}"`,
                      });
                    }

                    return filtered;
                  }}
                  selectOnFocus
                  clearOnBlur
                  handleHomeEndKeys
                  options={listOfGoals}
                  getOptionLabel={(option) => {
                    // Value selected with enter, right from the input
                    if (typeof option === "string") {
                      return option;
                    }
                    // Add "xxx" option created dynamically
                    if (option.inputValue) {
                      return option.inputValue;
                    }
                    // Regular option
                    return option.name;
                  }}
                  renderOption={(props, option) => {
                    const { key, ...restProps } = props;
                    return (
                      <li {...restProps} key={key}>
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
                                {option.name}
                              </Tooltip>
                            ) : (
                              <>{option.name}</>
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
                                    event.stopPropagation(); // prevent the click from propagating to the parent elements
                                    setListOfGoals((prevGoals) =>
                                      prevGoals.filter(
                                        (goal) => goal.id !== option.id
                                      )
                                    );
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
                  freeSolo
                  renderInput={(params) => (
                    <Tooltip
                      arrow
                      placement="top"
                      title={
                        <Typography variant="body2" sx={{ p: 1 }}>
                          Select or create a new goal
                        </Typography>
                      }
                    >
                      <TextField {...params} placeholder="e.g., monitor" />
                    </Tooltip>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm>
                <TextField
                  size="small"
                  sx={{ width: "100%" }}
                  placeholder="e.g., the usage of the learning materials in my course."
                  value={indicatorGoalText}
                  onChange={handleIndicatorGoalText}
                  disabled={indicatorGoal === null}
                />
              </Grid>
            </Grid>
          </Grid>
          {/* Formulating question */}
          <Grid item xs={12}>
            <Grid container alignItems="center" spacing={1}>
              <Grid item>
                <Typography>I am interested in</Typography>
              </Grid>
              <Grid item xs={12} sm>
                <TextField
                  size="small"
                  sx={{ width: "100%" }}
                  placeholder="e.g., knowing how often these learning materials are viewed by my students."
                  value={indicatorQuestion}
                  onChange={handleIndicatorQuestion}
                />
              </Grid>
            </Grid>
          </Grid>
          {/* Formulating indicator */}
          <Grid item xs={12}>
            <Grid container alignItems="center" spacing={1}>
              <Grid item>
                <Typography>I need an indicator showing</Typography>
              </Grid>
              <Grid item xs={12} sm>
                <TextField
                  size="small"
                  sx={{ width: "100%" }}
                  placeholder="e.g., the number of views of learning materials and sort by the most viewed ones."
                  value={indicatorName}
                  onChange={handleIndicatorName}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Data requirements */}
          <Grid item xs={12}>
            <Grid container spacing={1}>
              <Grid item sx={{ mt: 1 }}>
                <Typography>I would need the following data: </Typography>
              </Grid>
              <Grid item xs={12} sm>
                <Grid item xs={12}>
                  {indicatorDataArray.map((item, index) => (
                    <Grid
                      container
                      alignItems="center"
                      spacing={1}
                      sx={{ pb: 1 }}
                      key={index}
                    >
                      <Grid item>
                        <Typography>{index + 1}.</Typography>
                      </Grid>
                      <Grid item xs>
                        <TextField
                          size="small"
                          sx={{ width: "100%" }}
                          placeholder={item.placeholder}
                          value={item.value}
                          onChange={(e) =>
                            handleTextFieldChange(index, e.target.value)
                          }
                        />
                      </Grid>
                      {index > 1 && (
                        <Grid item>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteTextField(index)}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Grid>
                      )}
                    </Grid>
                  ))}
                  <Grid
                    container
                    alignItems="center"
                    spacing={1}
                    sx={{ pl: 2.5 }}
                  >
                    <Grid item>
                      <Button fullWidth onClick={addNewTextField}>
                        + Add more
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {!userCreatesIndicator && (
        <Grid container sx={{ mt: 2, mb: 2 }} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Button
              disabled={
                indicatorName === "" ||
                indicatorQuestion === "" ||
                indicatorGoalText == "" ||
                indicatorDataArray.some((item) => item.value === "")
              }
              fullWidth
              onClick={() => toggleUserCreatesIndicator()}
              variant="contained"
            >
              Create indicator
            </Button>
          </Grid>
        </Grid>
      )}
    </>
  );
};

export default CreatorHeader;
