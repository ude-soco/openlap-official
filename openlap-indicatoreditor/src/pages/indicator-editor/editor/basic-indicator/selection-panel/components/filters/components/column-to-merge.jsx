import React, { useContext } from "react";
import {
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  Radio,
  RadioGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { CompositeIndicatorContext } from "../../../../../composite-indicator/composite-indicator.jsx";
import HelpIcon from "@mui/icons-material/Help.js";

const ColumnToMerge = ({ state, setState }) => {
  const { setIndicatorRef } = useContext(CompositeIndicatorContext);

  const handleSelectColumnToMerge = (event) => {
    const { value } = event.target;

    console.log("value", value);
    const selectedOutput = state.compatibleIndicators.analyticsOutputs.find(
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
          <Grid container alignItems="center">
            <Grid item>
              <Typography>Select column to merge</Typography>
            </Grid>
            <Grid item>
              <Tooltip
                title={
                  <Grid container>
                    <Typography>To be explained</Typography>
                  </Grid>
                }
              >
                <IconButton color="primary">
                  <HelpIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <FormControl>
            <RadioGroup
              row
              aria-labelledby="radio-buttons-group-role-label"
              name="role"
              value={state.selectedAnalyticsOutput.id}
              onChange={handleSelectColumnToMerge}
            >
              {state.compatibleIndicators.content[0].analyticsOutputs.map(
                (output, index) => (
                  <FormControlLabel
                    key={index}
                    value={output.id}
                    control={<Radio />}
                    label={output.title}
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
