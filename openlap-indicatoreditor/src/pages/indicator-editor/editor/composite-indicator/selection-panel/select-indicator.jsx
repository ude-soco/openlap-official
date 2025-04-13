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
import { CompositeIndicatorContext } from "../composite-indicator.jsx";
import IndicatorList from "./components/indicator-list.jsx";
import CompatibleIndicatorList from "./components/compatible-indicator-list.jsx";

const SelectIndicator = () => {
  const { lockedStep, setLockedStep, indicatorRef, setIndicatorRef } =
    useContext(CompositeIndicatorContext);
  const [state, setState] = useState({
    showSelections: true,
    params: {
      page: 0,
    },
    allIndicators: {
      content: [],
      totalPages: 1,
    },
    selectedIndicator: [],
    compatibleIndicatorParams: {
      page: 0,
    },
    compatibleIndicators: {
      content: [
        {
          indicators: [],
          analyticsTechnique: {},
          analyticsOutputs: [],
        },
      ],
    },
    selectedCompatibleIndicators: [],
    loadingCompatibleIndicators: false,
    loadingPreview: false,
  });

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      indicators: {
        ...prevState.indicators,
        openPanel: !prevState.indicators.openPanel,
      },
    }));
  };

  const handleToggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handleUnlockColumnMerge = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      columnMerge: {
        ...prevState.columnMerge,
        locked: false,
        openPanel: true,
      },
    }));
  };

  return (
    <>
      <Accordion sx={{ mb: 1 }} expanded={lockedStep.indicators.openPanel}>
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
                      <Chip label="1" color="primary" />
                    </Grid>
                    <Grid item>
                      <Typography>Combine indicators</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
                  <Grid container>
                    {!lockedStep.indicators.openPanel && (
                      <FormGroup>
                        <FormControlLabel
                          control={<Switch checked={state.showSelections} />}
                          onChange={handleToggleShowSelection}
                          label="Show selections"
                        />
                      </FormGroup>
                    )}
                    <Button color="primary" variant="outlined" size="small" onClick={handleTogglePanel}>
                      {lockedStep.indicators.openPanel
                        ? "Close section"
                        : "Change selections"}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            {!lockedStep.indicators.openPanel && state.showSelections ? (
              <>
                {state.selectedIndicator.length !== 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Selected indicator:</Typography>
                      </Grid>
                      <Grid item>
                        <Chip label={state.selectedIndicator[0].name} />
                      </Grid>
                    </Grid>
                  </Grid>
                )}
                {state.selectedCompatibleIndicators.length !== 0 && (
                  <Grid item xs={12}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item>
                        <Typography>
                          Select compatible indicator(s):{" "}
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Grid container spacing={1}>
                          {state.selectedCompatibleIndicators.map(
                            (indicator, index) => (
                              <Grid item key={index}>
                                <Chip label={indicator.name} />
                              </Grid>
                            ),
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
                {Boolean(
                  state.compatibleIndicators.content[0].analyticsTechnique.name,
                ) && (
                  <>
                    <Grid item xs={12}>
                      <Grid container spacing={1} alignItems="center">
                        <Grid item>
                          <Typography>Shared analysis technique: </Typography>
                        </Grid>
                        <Grid item>
                          <Chip
                            label={
                              state.compatibleIndicators.content[0]
                                .analyticsTechnique.name
                            }
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  </>
                )}
              </>
            ) : undefined}
          </Grid>
        </AccordionSummary>

        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <IndicatorList state={state} setState={setState} />
            </Grid>

            {state.selectedIndicator.length !== 0 && (
              <Grid item xs={12}>
                <CompatibleIndicatorList state={state} setState={setState} />
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={6}>
              <Button
                variant="contained"
                fullWidth
                disabled={indicatorRef.indicators.length <= 1}
                onClick={handleUnlockColumnMerge}
              >
                Next
              </Button>
            </Grid>
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default SelectIndicator;
