import React, { useContext, useState } from "react";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  FormControlLabel,
  FormGroup,
  Grid,
  Switch,
  Typography,
} from "@mui/material";
import { ISCContext } from "../../indicator-specification-card.jsx";
import IconButton from "@mui/material/IconButton";
import LockIcon from "@mui/icons-material/Lock";
import ChartTypeFilter from "./components/chart-type-filter.jsx";
import VisualizationFilter from "./components/visualization-filter.jsx";

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
                  </Grid>
                </Grid>
                {!lockedStep.visualization.locked && (
                  <Grid item>
                    <Grid container>
                      {!lockedStep.visualization.openPanel && (
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
            {!lockedStep.visualization.openPanel && state.showSelections ? (
              <>
                {visRef.filter.type !== "" &&
                  requirements.goalType.name !== "" && (
                    <Grid item xs={12}>
                      <Grid container alignItems="center" spacing={1}>
                        <Grid item>
                          <Typography>Filter applied:</Typography>
                        </Grid>
                        <Grid item>
                          <Chip label={visRef.filter.type} />
                        </Grid>
                      </Grid>
                    </Grid>
                  )}
                {visRef.chart.type !== "" &&
                  requirements.goalType.name !== "" && (
                    <Grid item xs={12}>
                      <Grid container alignItems="center" spacing={1}>
                        <Grid item>
                          <Typography>Chart used:</Typography>
                        </Grid>
                        <Grid item>
                          <Chip label={visRef.chart.type} />
                        </Grid>
                      </Grid>
                    </Grid>
                  )}
              </>
            ) : undefined}
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
        {/*{lockedStep.path.locked && (*/}
        <AccordionActions sx={{ py: 2 }}>
          <Grid item xs={12}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12} md={6}>
                {lockedStep.visualization.step === "3" && (
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={visRef.chart.type === ""}
                    onClick={handleUnlockDataset}
                  >
                    Next
                  </Button>
                )}
                {lockedStep.visualization.step === "4" && (
                  <Button
                    fullWidth
                    variant="contained"
                    // disabled={visRef.chart.type === ""}
                    // onClick={handleUnlockDataset}
                  >
                    Save
                  </Button>
                )}
              </Grid>
            </Grid>
          </Grid>
        </AccordionActions>
        {/*)}*/}
      </Accordion>
    </>
  );
};

export default Visualization;
