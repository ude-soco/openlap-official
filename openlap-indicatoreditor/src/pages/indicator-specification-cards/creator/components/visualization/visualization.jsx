import React, { useContext, useState } from "react";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Grid,
  Grow,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import { ISCContext } from "../../indicator-specification-card.jsx";
import LockIcon from "@mui/icons-material/Lock";
import ChartTypeFilter from "./components/chart-type-filter.jsx";
import VisualizationFilter from "./components/visualization-filter.jsx";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";

const Visualization = () => {
  const {
    requirements,
    setRequirements,
    lockedStep,
    setLockedStep,
    visRef,
    setVisRef,
  } = useContext(ISCContext);
  const [state, setState] = useState({
    showSelections: true,
    tipAnchor: null,
  });

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      visualization: {
        ...prevState.visualization,
        openPanel: !prevState.visualization.openPanel,
      },
    }));
  };

  const handleToggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handleUnlockDataset = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      dataset: {
        ...prevState.dataset,
        locked: false,
        openPanel: true,
        step: "4",
      },
    }));
  };

  const handleUnlockFinalize = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      finalize: {
        ...prevState.finalize,
        locked: false,
        openPanel: true,
      },
    }));
  };

  return (
    <>
      <Accordion
        expanded={lockedStep.visualization.openPanel}
        disabled={lockedStep.visualization.locked}
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
                      {!lockedStep.visualization.locked ? (
                        <Chip
                          label={lockedStep.visualization.step}
                          color="primary"
                        />
                      ) : (
                        <IconButton size="small">
                          <LockIcon />
                        </IconButton>
                      )}
                    </Grid>
                    <Grid item>
                      <Typography>Visualization</Typography>
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
                        <Box sx={{ p: 2, maxWidth: 400 }}>
                          <Typography gutterBottom>
                            <b>Tip!</b>
                          </Typography>
                          <Typography gutterBottom>
                            Choose a <b>Chart type</b> that fits your needs.
                          </Typography>
                          <Typography gutterBottom>
                            Each chart requires specific type of data (e.g.{" "}
                            <em>categorical</em>, <em>numerical</em>, and{" "}
                            <em>categorical (ordinal)</em>).
                          </Typography>
                          <Typography gutterBottom>
                            Your <b>Dataset</b> should have the type of data
                            required by your selected <b>Chart</b>. Check the
                            required type of data under the short description
                            for the Charts.
                          </Typography>
                          <Typography>
                            <b>Good to know!</b>
                          </Typography>
                          <Typography>
                            Charts will be <b>recommended</b> to you if those
                            match the type of data available in your{" "}
                            <b>Dataset</b>.
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
                    {!lockedStep.visualization.openPanel && (
                      <>
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

                        <Grid item xs>
                          <Grid container justifyContent="flex-end">
                            <Button
                              onClick={handleTogglePanel}
                              startIcon={<EditIcon />}
                            >
                              Edit
                            </Button>
                          </Grid>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Grid>
                {lockedStep.visualization.openPanel && (
                  <Grid item>
                    <Button
                      onClick={handleTogglePanel}
                      startIcon={<CloseIcon />}
                    >
                      Close edit
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Grid>
            <Grow
              in={
                !lockedStep.visualization.locked &&
                !lockedStep.visualization.openPanel &&
                state.showSelections
              }
              timeout={{ enter: 500, exit: 0 }}
              unmountOnExit
            >
              <Grid item xs={12}>
                <Grid container spacing={1}>
                  {visRef.filter.type !== "" &&
                    requirements.goalType.name !== "" && (
                      <Grid item xs={12}>
                        <Grid container alignItems="center" spacing={1}>
                          <Grid item>
                            <Typography>Filter applied</Typography>
                          </Grid>
                          <Grid item>
                            <Chip label={visRef.filter.type} />
                          </Grid>
                        </Grid>
                      </Grid>
                    )}
                  {visRef.chart.type !== "" && (
                    <Grid item xs={12}>
                      <Grid container alignItems="center" spacing={1}>
                        <Grid item>
                          <Typography>Chart selected</Typography>
                        </Grid>
                        <Grid item>
                          <Chip label={visRef.chart.type} />
                        </Grid>
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
            <Grid item xs={12}>
              <ChartTypeFilter />
            </Grid>
            <Grid item xs={12}>
              <VisualizationFilter />
            </Grid>
          </Grid>
        </AccordionDetails>
        <AccordionActions sx={{ py: 2 }}>
          <Grid item xs={12}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12} md={6}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={visRef.chart.type === ""}
                  onClick={
                    lockedStep.visualization.step === "3"
                      ? handleUnlockDataset
                      : lockedStep.visualization.step === "4"
                      ? handleUnlockFinalize
                      : undefined
                  }
                >
                  Next
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Visualization;
