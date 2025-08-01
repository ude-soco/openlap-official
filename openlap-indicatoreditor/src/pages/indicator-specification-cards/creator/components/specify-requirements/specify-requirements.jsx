import { useContext, useState } from "react";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Fab,
  Grid,
  Grow,
  IconButton,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import DoneIcon from "@mui/icons-material/Done";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import { ISCContext } from "../../indicator-specification-card.jsx";
import GoalList from "./components/goal-list.jsx";
import DataList from "./components/data-list.jsx";

const SpecifyRequirements = () => {
  const { requirements, setRequirements, lockedStep, setLockedStep } =
    useContext(ISCContext);
  const [state, setState] = useState({
    showSelections: true,
    tipAnchor: null,
    goalExampleAnchor: null,
  });

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      requirements: {
        ...prevState.requirements,
        openPanel: !prevState.requirements.openPanel,
      },
    }));
  };

  const handleToggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handleFormData = (event) => {
    const { name, value } = event.target;
    setRequirements((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleUnlockPath = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      path: {
        ...prevState.path,
        locked: false,
        openPanel: true,
      },
    }));
  };

  const handleToggleGoalEdit = () => {
    setRequirements((prevState) => ({
      ...prevState,
      edit: {
        ...prevState.edit,
        goal: !prevState.edit.goal,
      },
      show: {
        ...prevState.show,
        question: true,
      },
    }));
  };

  const handleToggleQuestionEdit = () => {
    setRequirements((prevState) => ({
      ...prevState,
      edit: {
        ...prevState.edit,
        question: !prevState.edit.question,
      },
      show: {
        ...prevState.show,
        indicatorName: true,
      },
    }));
  };

  const handleCheckDisabled = (requirements) => {
    return (
      requirements.goalType.verb === "" ||
      requirements.goal === "" ||
      requirements.question === "" ||
      requirements.indicatorName === "" ||
      requirements.data.some(
        (item) =>
          typeof item.value !== "string" ||
          item.value.trim() === "" ||
          !item.type ||
          typeof item.type.type !== "string" ||
          item.type.type.trim() === ""
      )
    );
  };

  return (
    <>
      <Accordion expanded={lockedStep.requirements.openPanel}>
        <AccordionSummary>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Grid
                container
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Grid item xs>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      <Chip
                        label={lockedStep.requirements.step}
                        color="primary"
                      />
                    </Grid>
                    <Grid item xs>
                      <Typography>
                        Specify your goal, question, and indicator
                      </Typography>
                    </Grid>

                    <Grid item>
                      <Tooltip title={<Typography>Tips</Typography>} arrow>
                        <IconButton
                          onClick={(e) =>
                            setState((prevState) => ({
                              ...prevState,
                              tipAnchor: e.currentTarget,
                            }))
                          }
                        >
                          <TipsAndUpdatesIcon color="warning" />
                        </IconButton>
                      </Tooltip>
                      <Popover
                        open={Boolean(state.tipAnchor)}
                        anchorEl={state.tipAnchor}
                        onClose={() =>
                          setState((prevState) => ({
                            ...prevState,
                            tipAnchor: null,
                          }))
                        }
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "left",
                        }}
                        PaperProps={{
                          sx: {
                            backgroundColor: "primary.main",
                            color: "primary.contrastText",
                            position: "absolute",
                            p: 1,
                          },
                        }}
                      >
                        <Box sx={{ p: 2, maxWidth: 350 }}>
                          <Typography gutterBottom>
                            <b>Tip!</b>
                          </Typography>
                          <Typography>
                            Think about what exactly you want to measure, why it
                            matters, and what data you need to help you answer
                            your question.
                          </Typography>
                        </Box>
                        <Grid container justifyContent="flex-end">
                          <Button
                            size="small"
                            onClick={() =>
                              setState((prevState) => ({
                                ...prevState,
                                tipAnchor: null,
                              }))
                            }
                            color="text"
                            variant="outlined"
                          >
                            Close
                          </Button>
                        </Grid>
                      </Popover>
                    </Grid>
                    {!lockedStep.requirements.openPanel && (
                      <>
                        <Grid item>
                          <Tooltip
                            arrow
                            title={<Typography>Edit requirements</Typography>}
                          >
                            <IconButton onClick={handleTogglePanel}>
                              <EditIcon color="primary" />
                            </IconButton>
                          </Tooltip>
                        </Grid>

                        <Grid item>
                          <Tooltip
                            title={
                              <Typography>
                                {!state.showSelections
                                  ? "Show summary"
                                  : "Hide summary"}
                              </Typography>
                            }
                          >
                            <IconButton onClick={handleToggleShowSelection}>
                              {!state.showSelections ? (
                                <VisibilityIcon color="primary" />
                              ) : (
                                <VisibilityOffIcon color="primary" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Grid>
                {lockedStep.requirements.openPanel && (
                  <Grid item>
                    <Tooltip title={<Typography>Close panel</Typography>}>
                      <IconButton onClick={handleTogglePanel}>
                        <CloseIcon color="primary" />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                )}
              </Grid>
            </Grid>

            <Grow
              in={!lockedStep.requirements.openPanel && state.showSelections}
              timeout={{ enter: 500, exit: 0 }}
              unmountOnExit
            >
              <Grid item xs={12}>
                <Grid container spacing={1}>
                  {requirements.goal !== "" &&
                    requirements.goalType.name !== "" && (
                      <Grid item xs={12}>
                        <Grid container alignItems="center" spacing={1}>
                          <Grid item>
                            <Typography>I want to</Typography>
                          </Grid>
                          <Grid item>
                            <Chip label={requirements.goalType.verb} />
                          </Grid>
                          <Grid item>
                            <Chip label={requirements.goal} />
                          </Grid>
                        </Grid>
                      </Grid>
                    )}
                  {requirements.question !== "" && (
                    <Grid item xs={12}>
                      <Grid container alignItems="center" spacing={1}>
                        <Grid item>
                          <Typography>I am interested in</Typography>
                        </Grid>
                        <Grid item>
                          <Chip label={requirements.question} />
                        </Grid>
                      </Grid>
                    </Grid>
                  )}
                  {requirements.question !== "" && (
                    <Grid item xs={12}>
                      <Grid container alignItems="center" spacing={1}>
                        <Grid item>
                          <Typography>I need an indicator showing</Typography>
                        </Grid>
                        <Grid item>
                          <Chip label={requirements.indicatorName} />
                        </Grid>
                      </Grid>
                    </Grid>
                  )}
                  {requirements.data.some((d) => d.value) && (
                    <Grid item xs={12}>
                      <Grid container alignItems="center" spacing={1}>
                        <Grid item>
                          <Typography>I need the following data</Typography>
                        </Grid>
                        {requirements.data.map((item, index) => {
                          if (item.value !== "") {
                            return (
                              <Grid item key={index}>
                                <Chip label={item.value} />
                              </Grid>
                            );
                          }
                          return undefined;
                        })}
                      </Grid>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </Grow>
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {requirements.edit.goal ? (
              <>
                <Grid item xs={12}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid item xs={12} md={8}>
                      <Typography variant="body2">Specify your goal</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid item xs={12} md={8}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item>
                          <Tooltip
                            arrow
                            title={
                              <Typography>
                                Click to view some examples
                              </Typography>
                            }
                          >
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={(e) =>
                                setState((prevState) => ({
                                  ...prevState,
                                  goalExampleAnchor: e.currentTarget,
                                }))
                              }
                            >
                              <TipsAndUpdatesIcon />
                            </IconButton>
                          </Tooltip>
                          <Popover
                            open={Boolean(state.goalExampleAnchor)}
                            anchorEl={state.goalExampleAnchor}
                            onClose={() =>
                              setState((prevState) => ({
                                ...prevState,
                                goalExampleAnchor: null,
                              }))
                            }
                            anchorOrigin={{
                              vertical: "bottom",
                              horizontal: "left",
                            }}
                            PaperProps={{
                              sx: {
                                backgroundColor: "primary.main",
                                color: "primary.contrastText",
                                position: "absolute",
                                p: 1,
                              },
                            }}
                          >
                            <Box sx={{ p: 2, maxWidth: 400 }}>
                              {/* <Typography>
                                Here are some examples for inspiration:
                              </Typography> */}
                              <Typography gutterBottom>
                                Here are some <b>Examples</b> for inspiration:
                              </Typography>
                              <Typography>
                                <ul>
                                  <li>
                                    I want to <b>assess</b> students’
                                    understanding of course material by
                                    analyzing quiz and test results weekly.
                                  </li>
                                  <li>
                                    I want to <b>monitor</b> student engagement
                                    by tracking logins, participation in
                                    discussions, and time spent on learning
                                    activities.
                                  </li>
                                  <li>
                                    I want to <b>intervene</b> early by
                                    identifying students at risk of failure
                                    using predictive models based on past
                                    performance and engagement.
                                  </li>
                                </ul>
                              </Typography>
                              <Typography>
                                You can select one of the goals from the list.
                              </Typography>
                              <Typography>
                                You can also create your own goal by typing in
                                this text box and then selecting it.
                              </Typography>
                            </Box>
                            <Grid container justifyContent="flex-end">
                              <Button
                                size="small"
                                onClick={() =>
                                  setState((prevState) => ({
                                    ...prevState,
                                    goalExampleAnchor: null,
                                  }))
                                }
                                color="text"
                                variant="outlined"
                              >
                                Close
                              </Button>
                            </Grid>
                          </Popover>
                        </Grid>
                        <Grid item xs sm={4}>
                          <GoalList />
                        </Grid>
                        <Grid item xs={12} sm>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs>
                              <TextField
                                fullWidth
                                name="goal"
                                value={requirements.goal}
                                label="Describe your goal"
                                placeholder="e.g., the usage of the learning materials in my course."
                                onChange={handleFormData}
                              />
                            </Grid>
                            <Grid item>
                              <Grid container justifyContent="center">
                                <Tooltip title="Confirm">
                                  <span>
                                    <Fab
                                      color="primary"
                                      size="small"
                                      onClick={handleToggleGoalEdit}
                                      disabled={
                                        requirements.goal.length < 1 ||
                                        requirements.goalType.verb.length < 1
                                      }
                                    >
                                      <DoneIcon />
                                    </Fab>
                                  </span>
                                </Tooltip>
                              </Grid>
                            </Grid>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid item xs={12} md={8}>
                      <Tooltip arrow title="Edit your goal">
                        <Grid
                          container
                          alignItems="center"
                          spacing={1}
                          onClick={handleToggleGoalEdit}
                          sx={{
                            "&:hover": {
                              cursor: "pointer",
                              backgroundColor: "rgba(0, 0, 0, 0.03)",
                            },
                          }}
                        >
                          <Grid item xs>
                            <Typography>
                              <i>Your goal:</i> I want to{" "}
                              <b>{requirements.goalType.verb}</b> the{" "}
                              <b>{requirements.goal}</b>
                            </Typography>
                          </Grid>
                          <EditIcon color="primary" />
                        </Grid>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Grid>
              </>
            )}

            {requirements.show.question && (
              <>
                {requirements.edit.question ? (
                  <>
                    <Grid item xs={12}>
                      <Grid container spacing={2} justifyContent="center">
                        <Grid item xs={12}>
                          <Grid container spacing={2} justifyContent="center">
                            <Grid item xs={12} md={8}>
                              <Typography variant="body2">
                                Specify your question
                              </Typography>
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid item xs={12} md={8}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item >
                              <TextField
                                fullWidth
                                required
                                name="question"
                                value={requirements.question}
                                label="I am interested in"
                                placeholder="e.g., knowing how often these learning materials are viewed by my students."
                                onChange={handleFormData}
                              />
                            </Grid>
                            <Grid item>
                              <Grid container justifyContent="center">
                                <Tooltip title="Confirm">
                                  <span>
                                    <Fab
                                      size="small"
                                      color="primary"
                                      onClick={handleToggleQuestionEdit}
                                      disabled={
                                        requirements.question.length < 1
                                      }
                                    >
                                      <DoneIcon />
                                    </Fab>
                                  </span>
                                </Tooltip>
                              </Grid>
                            </Grid>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={12}>
                      <Grid container spacing={2} justifyContent="center">
                        <Tooltip arrow title="Edit your question">
                          <Grid item xs={12} md={8}>
                            <Grid
                              container
                              alignItems="center"
                              spacing={1}
                              onClick={handleToggleQuestionEdit}
                              sx={{
                                "&:hover": {
                                  cursor: "pointer",
                                  backgroundColor: "rgba(0, 0, 0, 0.03)",
                                },
                              }}
                            >
                              <Grid item xs>
                                <Typography gutterBottom>
                                  <i>Your question:</i> I am interested in{" "}
                                  <b>{requirements.question}</b>
                                </Typography>
                              </Grid>
                              <Grid item>
                                <EditIcon color="primary" />
                              </Grid>
                            </Grid>
                          </Grid>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </>
                )}
              </>
            )}

            {requirements.show.indicatorName && (
              <>
                <Grid item xs={12}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid item xs={12}>
                      <Grid container spacing={2} justifyContent="center">
                        <Grid item xs={12} md={8}>
                          <Typography variant="body2">
                            Specify your indicator
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs>
                          <TextField
                            fullWidth
                            required
                            name="indicatorName"
                            value={requirements.indicatorName}
                            label="I need an indicator showing"
                            placeholder="e.g., the number of views of learning materials and sort by the most viewed ones."
                            onChange={handleFormData}
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid item xs={12} md={8}>
                      <DataList />
                    </Grid>
                  </Grid>
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
        {requirements.show.indicatorName && (
          <AccordionActions sx={{ py: 2 }}>
            <Grid item xs={12}>
              <Grid container spacing={2} justifyContent="center">
                <Grid item xs={12} md={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={handleCheckDisabled(requirements)}
                    onClick={handleUnlockPath}
                  >
                    Next
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </AccordionActions>
        )}
      </Accordion>
    </>
  );
};

export default SpecifyRequirements;
