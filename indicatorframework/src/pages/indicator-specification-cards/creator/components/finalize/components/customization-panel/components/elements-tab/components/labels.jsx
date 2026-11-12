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
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        dataLabels: {
          ...p.options.dataLabels,
          enabled: e.target.checked,
        },
      },
    }));
  };

  const handleDataLabelsBgSwitch = (e) => {
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        dataLabels: {
          ...p.options.dataLabels,
          background: {
            ...p.options.dataLabels.background,
            enabled: e.target.checked,
          },
        },
      },
    }));
  };

  const handleLabelsPosition = (e) => {
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        plotOptions: {
          ...p.options.plotOptions,
          bar: {
            ...p.options.plotOptions.bar,
            dataLabels: {
              ...p.options.plotOptions.bar.dataLabels,
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
      )}

      {state.configuration.isLabelsPositionChangeable && (
        <FormControl>
          <FormLabel>Labels Position</FormLabel>
          <RadioGroup
            value={state.options.plotOptions.bar.dataLabels.position}
            onChange={handleLabelsPosition}
            row
          >
            {state.configuration.isLabelsPositionTopAvailable && (
              <FormControlLabel label="Top" control={<Radio value="top" />} />
            )}
            {state.configuration.isLabelsPositionCenterAvailable && (
              <FormControlLabel
                label="Center"
                control={<Radio value="center" />}
              />
            )}
          </RadioGroup>
        </FormControl>
      )}
    </>
  );
};

export default Labels;
