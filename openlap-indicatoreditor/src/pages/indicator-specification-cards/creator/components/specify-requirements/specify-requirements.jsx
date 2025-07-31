import { useContext, useState } from "react";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
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
import { ISCContext } from "../../indicator-specification-card.jsx";
import GoalList from "./components/goal-list.jsx";
import DataList from "./components/data-list.jsx";
import { v4 as uuidv4 } from "uuid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import DoneIcon from "@mui/icons-material/Done";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";

const SpecifyRequirements = () => {
  const { requirements, setRequirements, lockedStep, setLockedStep } =
    useContext(ISCContext);
  const [state, setState] = useState({
    showSelections: true,
    tipAnchor: null,
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
                    <Grid item>
                      <Typography>
                        Specify your goal, question, and indicator
                      </Typography>
                    </Grid>

                    <Grid item>
                      <Tooltip title="Tips">
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
                        <Typography sx={{ p: 2, maxWidth: 350 }}>
                          Tip: Think about what exactly you want to measure, why
                          it matters, and what data you need to help you answer
                          your question.
                        </Typography>
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
                          <Tooltip title="Edit requirements">
                            <IconButton onClick={handleTogglePanel}>
                              <EditIcon color="primary" />
                            </IconButton>
                          </Tooltip>
                        </Grid>

                        <Grid item>
                          <Tooltip
                            title={
                              !state.showSelections
                                ? "Show summary"
                                : "Hide summary"
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
                    <Tooltip title="Close panel">
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
                      <Grid container spacing={2}>
                        <Grid item xs sm={4}>
                          <GoalList />
                        </Grid>
                        <Grid item xs={12} sm>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs>
                              <TextField
                                fullWidth
                                required
                                name="goal"
                                value={requirements.goal}
                                label="Describe your goal"
                                placeholder="e.g., the usage of the learning materials in my course."
                                onChange={handleFormData}
                              />
                            </Grid>
                            <Grid item>
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
              </>
            ) : (
              <>
                <Grid item xs={12}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid item xs={12} md={8}>
                      <Grid container alignItems="center" spacing={1}>
                        <Grid item>
                          <Typography>
                            <i>Your goal:</i> I want to{" "}
                            <b>{requirements.goalType.verb}</b> the{" "}
                            <b>{requirements.goal}</b>
                          </Typography>
                        </Grid>
                        <Grid item>
                          <Tooltip title="Edit your goal">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={handleToggleGoalEdit}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </Grid>
                      </Grid>
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
                            <Grid item xs>
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
                              <Tooltip title="Confirm">
                                <span>
                                  <Fab
                                    size="small"
                                    color="primary"
                                    onClick={handleToggleQuestionEdit}
                                    disabled={requirements.question.length < 1}
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
                  </>
                ) : (
                  <>
                    <Grid item xs={12}>
                      <Grid container spacing={2} justifyContent="center">
                        <Grid item xs={12} md={8}>
                          <Grid container alignItems="center" spacing={1}>
                            <Grid item>
                              <Typography>
                                <i>Your question:</i> I am interested in{" "}
                                <b>{requirements.question}</b>
                              </Typography>
                            </Grid>
                            <Grid item>
                              <Tooltip title="Edit your question">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={handleToggleQuestionEdit}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            </Grid>
                          </Grid>
                        </Grid>
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
                    disabled={() => handleCheckDisabled(requirements)}
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
