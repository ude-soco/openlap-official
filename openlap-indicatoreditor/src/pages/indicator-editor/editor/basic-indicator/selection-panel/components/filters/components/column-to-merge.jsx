import React, { useContext, useEffect } from "react";
import {
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { CompositeIndicatorContext } from "../../../../../composite-indicator/composite-indicator.jsx";

const ColumnToMerge = ({ state, setState }) => {
  const { setIndicatorRef } = useContext(CompositeIndicatorContext);

  const handleSelectColumnToMerge = (event) => {
    const { value } = event.target;
    const selectedOutput = state.indicatorsToAnalyze.analyticsOutputs.find(
      (item) => item.id === value,
    );
    if (selectedOutput) {
      setState((prevState) => ({
        ...prevState,
        selectedAnalyticsOutput: selectedOutput,
      }));
      setIndicatorRef((prevState) => ({
        ...prevState,
        columnToMerge: selectedOutput,
      }));
    }
  };

  return (
    <>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Typography>Select column to merge</Typography>
        </Grid>
        <Grid item xs={12}>
          <FormControl>
            <RadioGroup
              row
              aria-labelledby="radio-buttons-group-role-label"
              defaultValue={state.selectedAnalyticsOutput.id || undefined}
              onChange={handleSelectColumnToMerge}
            >
              {state.indicatorsToAnalyze.analyticsOutputs.map(
                (output, index) => (
                  <FormControlLabel
                    key={index}
                    value={output.id}
                    control={<Radio />}
                    label={
                      <Grid container spacing={1} alignItems="center">
                        <Grid item>
                          <Typography>{output.title}</Typography>
                        </Grid>
                        {state.indicatorsToAnalyze.analyticsOutputs.length ===
                          1 && (
                          <Grid item>
                            <Tooltip
                              title={
                                <Typography variant="body2" align="center">
                                  There is only one compatible column available
                                  to merge
                                </Typography>
                              }
                            >
                              <Chip label="Preselected" />
                            </Tooltip>
                          </Grid>
                        )}
                      </Grid>
                    }
                  />
                ),
              )}
            </RadioGroup>
          </FormControl>
        </Grid>
      </Grid>
    </>
  );
};

export default ColumnToMerge;
