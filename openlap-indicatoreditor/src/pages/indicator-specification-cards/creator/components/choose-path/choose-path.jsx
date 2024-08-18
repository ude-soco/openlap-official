import React, { useContext, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  FormControlLabel,
  FormGroup,
  Grid,
  Paper,
  Switch,
  Typography,
} from "@mui/material";
import { ISCContext } from "../../indicator-specification-card.jsx";
import { blue, orange } from "@mui/material/colors";
import IconButton from "@mui/material/IconButton";
import LockIcon from "@mui/icons-material/Lock.js";

const ChoosePath = () => {
  const { requirements, setRequirements, lockedStep, setLockedStep } =
    useContext(ISCContext);
  const [state, setState] = useState({
    showSelections: true,
  });

  const handleChooseVisualizationPath = () => {
    let vis = "Visualization";
    handleTogglePanel();
    if (requirements.selectedPath !== vis) {
      setLockedStep((prevState) => ({
        ...prevState,
        visualization: {
          ...prevState.visualization,
          locked: false,
          openPanel: true,
          step: "3",
        },
        dataset: {
          ...prevState.dataset,
          locked: true,
          openedPanel: false,
          step: "4",
        },
      }));
      setRequirements((prevState) => ({
        ...prevState,
        selectedPath: vis,
      }));
    } else {
      setLockedStep((prevState) => ({
        ...prevState,
        visualization: {
          ...prevState.visualization,
          openedPanel: true,
        },
      }));
    }
  };

  const handleChooseDatasetPath = () => {
    handleTogglePanel();
    let data = "Dataset";
    if (requirements.selectedPath !== data) {
      {
        setLockedStep((prevState) => ({
          ...prevState,
          dataset: {
            ...prevState.dataset,
            locked: false,
            openPanel: true,
            step: "3",
          },
          visualization: {
            ...prevState.visualization,
            locked: true,
            openPanel: false,
            step: "4",
          },
        }));
        setRequirements((prevState) => ({
          ...prevState,
          selectedPath: data,
        }));
      }
    } else {
      setLockedStep((prevState) => ({
        ...prevState,
        dataset: {
          ...prevState.dataset,
          openedPanel: true,
        },
      }));
    }
  };

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      path: {
        ...prevState.path,
        openPanel: !prevState.path.openPanel,
      },
    }));
  };

  const handleToggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const buttonStyle = (type = "visualization") => {
    return {
      height: 150,
      width: 150,
      border: "3px solid",
      borderColor: type === "dataset" ? blue[200] : orange[200],
      "&:hover": {
        boxShadow: 5,
        borderColor: type === "dataset" ? blue[900] : orange[800],
      },
      p: 2,
      borderRadius: 2,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      cursor: "pointer",
    };
  };

  return (
    <>
      <Accordion
        expanded={lockedStep.path.openPanel}
        disabled={lockedStep.path.locked}
      >
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
                      {!lockedStep.path.locked ? (
                        <Chip label={lockedStep.path.step} color="primary" />
                      ) : (
                        <IconButton size="small">
                          <LockIcon />
                        </IconButton>
                      )}
                    </Grid>
                    <Grid item>
                      <Typography>How would you like to start?</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                {!lockedStep.path.locked && (
                  <Grid item>
                    <Grid container>
                      {!lockedStep.path.openPanel && (
                        <FormGroup>
                          <FormControlLabel
                            control={<Switch checked={state.showSelections} />}
                            onChange={handleToggleShowSelection}
                            label="Show selections"
                          />
                        </FormGroup>
                      )}
                      <Button color="primary" onClick={handleTogglePanel}>
                        {lockedStep.path.openPanel ? "Close section" : "CHANGE"}
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
            {!lockedStep.path.openPanel && state.showSelections ? (
              <>
                {requirements.selectedPath !== "" && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Selected path:</Typography>
                      </Grid>
                      <Grid item>
                        <Chip label={requirements.selectedPath} />
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </>
            ) : undefined}
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container justifyContent="center" spacing={4} sx={{ py: 2 }}>
            <Grid item>
              <Paper
                elevation={0}
                sx={buttonStyle()}
                onClick={handleChooseVisualizationPath}
              >
                <Typography variant="h6" align="center">
                  Select Visualization
                </Typography>
              </Paper>
            </Grid>

            <Grid item>
              <Paper
                elevation={0}
                sx={buttonStyle("dataset")}
                onClick={handleChooseDatasetPath}
              >
                <Typography variant="h6" align="center">
                  Select Data
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export default ChoosePath;
