import React, { useContext, useState } from "react";
import { MultiLevelAnalysisIndicatorContext } from "../../../multi-level-analysis-indicator.jsx";
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
import IndicatorList from "./indicator-list.jsx";

const SelectIndicator = () => {
  const { lockedStep, setLockedStep } = useContext(
    MultiLevelAnalysisIndicatorContext,
  );
  const [state, setState] = useState({
    showSelections: true,
    params: {
      page: 0,
    },
    loadingIndicators: false,
    allIndicators: {
      content: [],
    },
    selectedIndicators: [],
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
    selectedAnalyticsOutput: {},
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
                      <Typography>Select indicators</Typography>
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
                {state.selectedIndicators.length !== 0 && (
                  <Grid item xs={12}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item>
                        <Typography>Selected indicators:</Typography>
                      </Grid>
                      <Grid item>
                        <Grid container spacing={1}>
                          {state.selectedIndicators.map((indicator, index) => (
                            <Grid item key={index}>
                              <Chip label={indicator.name} />
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
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
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Button
            variant="contained"
            fullWidth
            // disabled={
            //   !Object.entries(indicatorRef.columnToMerge).length ||
            //   indicatorRef.indicators.length <= 1 ||
            //   !Object.entries(indicatorRef.analyzedData).length
            // }
            onClick={handleUnlockColumnMerge}
          >
            Next
          </Button>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default SelectIndicator;
