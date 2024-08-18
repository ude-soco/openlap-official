import React, { useContext, useState } from "react";
import { ISCContext } from "../../indicator-specification-card.jsx";
import {
  Accordion,
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
import IconButton from "@mui/material/IconButton";
import LockIcon from "@mui/icons-material/Lock";
import DataTableManager from "./data-table-manager/data-table-manager.jsx";

const Dataset = () => {
  const { requirements, setRequirements, lockedStep, setLockedStep } =
    useContext(ISCContext);
  const [state, setState] = useState({
    showSelections: true,
  });

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      dataset: {
        ...prevState.dataset,
        openPanel: !prevState.dataset.openPanel,
      },
    }));
  };

  const handleToggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handleUnlockVisualization = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      visualization: {
        ...prevState.visualization,
        locked: false,
        openPanel: true,
        step: "4",
      },
    }));
  };

  return (
    <>
      <Accordion
        expanded={lockedStep.dataset.openPanel}
        disabled={lockedStep.dataset.locked}
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
                      {!lockedStep.dataset.locked ? (
                        <Chip label={lockedStep.dataset.step} color="primary" />
                      ) : (
                        <IconButton size="small">
                          <LockIcon />
                        </IconButton>
                      )}
                    </Grid>
                    <Grid item>
                      <Typography>Dataset</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                {!lockedStep.dataset.locked && (
                  <Grid item>
                    <Grid container>
                      {!lockedStep.dataset.openPanel && (
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
            {!lockedStep.dataset.openPanel && state.showSelections ? (
              <></>
            ) : undefined}
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <DataTableManager />
            </Grid>
          </Grid>
        </AccordionDetails>
        {/*<AccordionActions sx={{ py: 2 }}>*/}
        {/*  <Grid item xs={12}>*/}
        {/*    <Grid container spacing={2} justifyContent="center">*/}
        {/*      <Grid item xs={12} md={6}>*/}
        {/*        {lockedStep.dataset.step === "3" && (*/}
        {/*          <Button*/}
        {/*            fullWidth*/}
        {/*            variant="contained"*/}
        {/*            // disabled={visRef.chart.type === ""}*/}
        {/*            onClick={handleUnlockVisualization}*/}
        {/*          >*/}
        {/*            Next*/}
        {/*          </Button>*/}
        {/*        )}*/}
        {/*        {lockedStep.dataset.step === "4" && (*/}
        {/*          <Button*/}
        {/*            fullWidth*/}
        {/*            variant="contained"*/}
        {/*            // disabled={visRef.chart.type === ""}*/}
        {/*            // onClick={handleUnlockDataset}*/}
        {/*          >*/}
        {/*            Save*/}
        {/*          </Button>*/}
        {/*        )}*/}
        {/*      </Grid>*/}
        {/*    </Grid>*/}
        {/*  </Grid>*/}
        {/*</AccordionActions>*/}
        {/*)}*/}
      </Accordion>
    </>
  );
};

export default Dataset;
