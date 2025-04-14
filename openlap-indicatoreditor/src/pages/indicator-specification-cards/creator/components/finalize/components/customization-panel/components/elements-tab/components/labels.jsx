import React from "react";
import Grid from "@mui/material/Grid2";
import {
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Radio,
  RadioGroup,
  Switch,
} from "@mui/material";

const Labels = ({ state, setState }) => {
  const handleDataLabelsSwitch = (e) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        dataLabels: {
          ...prevState.options.dataLabels,
          enabled: e.target.checked,
        },
      },
    }));
  };

  const handleDataLabelsBgSwitch = (e) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        dataLabels: {
          ...prevState.options.dataLabels,
          background: {
            ...prevState.options.dataLabels.background,
            enabled: e.target.checked,
          },
        },
      },
    }));
  };

  const handleLabelsPosition = (e) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        plotOptions: {
          ...prevState.options.plotOptions,
          bar: {
            ...prevState.options.plotOptions.bar,
            dataLabels: {
              ...prevState.options.plotOptions.bar.dataLabels,
              position: e.target.value,
            },
          },
        },
      },
    }));
  };

  return (
    <>
      {(state.configuration.isShowHideLabelsAvailable ||
        state.configuration.isShowHideLabelsBackgroundAvailable) && (
        <Grid size={12}>
          <FormControl>
            <FormLabel>Data Labels</FormLabel>
            <FormGroup>
              {state.configuration.isShowHideLabelsAvailable && (
                <FormControlLabel
                  sx={{ mt: 1 }}
                  label="Show labels"
                  control={
                    <Switch
                      color="primary"
                      checked={state.options.dataLabels.enabled}
                      onChange={handleDataLabelsSwitch}
                    />
                  }
                />
              )}
              {state.configuration.isShowHideLabelsBackgroundAvailable && (
                <FormControlLabel
                  label="Show labels background"
                  control={
                    <Switch
                      color="primary"
                      checked={state.options.dataLabels.background.enabled}
                      onChange={handleDataLabelsBgSwitch}
                    />
                  }
                />
              )}
            </FormGroup>
          </FormControl>
        </Grid>
      )}

      {state.configuration.isLabelsPositionChangeable && (
        <Grid size={12}>
          <FormControl>
            <FormLabel>Labels Position</FormLabel>
            <RadioGroup
              value={state.options.plotOptions.bar.dataLabels.position}
              onChange={handleLabelsPosition}
              row
            >
              {state.configuration.isLabelsPositionTopAvailable && (
                <FormControlLabel
                  label="Top"
                  control={<Radio value="top" />}
                ></FormControlLabel>
              )}
              {state.configuration.isLabelsPositionCenterAvailable && (
                <FormControlLabel
                  label="Center"
                  control={<Radio value="center" />}
                ></FormControlLabel>
              )}
            </RadioGroup>
          </FormControl>
        </Grid>
      )}
    </>
  );
};

export default Labels;
