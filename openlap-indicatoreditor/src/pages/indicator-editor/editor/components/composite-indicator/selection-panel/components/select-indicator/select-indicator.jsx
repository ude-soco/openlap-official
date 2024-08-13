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
  Switch,
  Typography,
} from "@mui/material";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { CompositeIndicatorContext } from "../../../composite-indicator.jsx";
import IndicatorList from "./components/indicator-list.jsx";
import CompatibleIndicatorList from "./components/compatible-indicator-list.jsx";

const SelectIndicator = () => {
  const { api } = useContext(AuthContext);
  const { lockedStep, setLockedStep } = useContext(CompositeIndicatorContext);
  const [state, setState] = useState({
    showSelections: true,
    params: {
      page: 0,
    },
    allIndicators: {
      content: [],
    },
    selectedIndicator: {},
    compatibleIndicators: {
      indicators: [],
      analyticsTechnique: {},
      analyticsOutputs: [],
    },
    selectedCompatibleIndicators: [],
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
                      <Typography>Select an indicator</Typography>
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
                    <Button color="primary" onClick={handleTogglePanel}>
                      {lockedStep.indicators.openPanel
                        ? "Close section"
                        : "CHANGE"}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            {!lockedStep.indicators.openPanel &&
              state.showSelections &&
              Object.entries(state.selectedIndicator).length !== 0 && (
                <Grid item xs={12}>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      <Typography>Selected indicator:</Typography>
                    </Grid>
                    <Grid item>
                      <Chip label={state.selectedIndicator.name} />
                    </Grid>
                  </Grid>
                </Grid>
              )}
          </Grid>
        </AccordionSummary>

        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <IndicatorList state={state} setState={setState} />
            </Grid>

            {Object.entries(state.selectedIndicator).length !== 0 && (
              <Grid item xs={12}>
                <CompatibleIndicatorList state={state} setState={setState} />
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export default SelectIndicator;
