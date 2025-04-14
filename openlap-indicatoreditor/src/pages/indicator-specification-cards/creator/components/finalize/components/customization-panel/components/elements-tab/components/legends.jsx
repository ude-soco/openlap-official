import React from "react";
import Grid from "@mui/material/Grid2";
import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Switch,
} from "@mui/material";

const Legends = ({ state, setState }) => {
  const handleLegendSwitch = (e) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        legend: {
          ...prevState.options.legend,
          show: e.target.checked,
        },
      },
    }));
  };

  const handleLegendPosition = (e) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        legend: {
          ...prevState.options.legend,
          position: e.target.value,
        },
      },
    }));
  };
  return (
    <>
      {state.configuration.isShowHideLegendAvailable && (
        <Grid size={12}>
          <FormControlLabel
            sx={{ mt: 1 }}
            label="Show legend"
            control={
              <Switch
                checked={state.options.legend.show}
                onChange={handleLegendSwitch}
                color="primary"
              />
            }
          />
        </Grid>
      )}

      {state.configuration.isLegendPositionChangeable && (
        <Grid size={12}>
          <FormControl>
            <FormLabel id="role-label">Legend Position</FormLabel>
            <RadioGroup
              value={state.options.legend.position}
              onChange={handleLegendPosition}
              row
            >
              {state.configuration.isLegendPositionTopAvailable && (
                <FormControlLabel label="Top" control={<Radio value="top" />} />
              )}
              {state.configuration.isLegendPositionRightAvailable && (
                <FormControlLabel
                  label="Right"
                  control={<Radio value="right" />}
                />
              )}
              {state.configuration.isLegendPositionBottomAvailable && (
                <FormControlLabel
                  label="Bottom"
                  control={<Radio value="bottom" />}
                />
              )}
              {state.configuration.isLegendPositionLeftAvailable && (
                <FormControlLabel
                  label="Left"
                  control={<Radio value="left" />}
                />
              )}
            </RadioGroup>
          </FormControl>
        </Grid>
      )}
    </>
  );
};

export default Legends;
