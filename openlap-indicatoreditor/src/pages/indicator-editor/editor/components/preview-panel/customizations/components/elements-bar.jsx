import { useState } from "react";
import {
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  FormLabel,
  FormControl,
  TextField,
  Checkbox,
  Grid,
  FormGroup,
} from "@mui/material";

export const ElementsBar = ({ state, setState, chartConfiguration }) => {
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [inputTitleValue, setInputTitleValue] = useState(state.chartTitle);
  const [inputSubtitleValue, setInputSubtitleValue] = useState(
    state.chartSubtitle
  );

  const handleLegendSwitch = (e) => {
    setState((prevState) => ({
      ...prevState,
      showLegend: e.target.checked,
      edited: true,
    }));
  };

  const handleLegendPosition = (e) => {
    setState((prevState) => ({
      ...prevState,
      legendPosition: e.target.value,
      edited: true,
    }));
  };

  const handleXaxisChange = (e) => {
    setState((prevState) => ({
      ...prevState,
      showXAxis: e.target.checked,
      edited: true,
    }));
  };

  const handleYaxisChange = (e) => {
    setState((prevState) => ({
      ...prevState,
      showYAxis: e.target.checked,
      edited: true,
    }));
  };

  const handleChartTitle = (e) => {
    const newValue = e.target.value;
    setInputTitleValue(newValue); // Update input field immediately

    // Clear the existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set a new timeout
    const timeout = setTimeout(() => {
      setState((prevState) => ({
        ...prevState,
        chartTitle: e.target.value,
        edited: true,
      }));
    }, 1000);

    setTypingTimeout(timeout);
  };

  const handleTitlePosition = (e) => {
    setState((prevState) => ({
      ...prevState,
      titleAndSubTitlePosition: e.target.value,
      edited: true,
    }));
  };

  const handleChartSubTitle = (e) => {
    const newValue = e.target.value;
    setInputSubtitleValue(newValue); // Update input field immediately

    // Clear the existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set a new timeout
    const timeout = setTimeout(() => {
      setState((prevState) => ({
        ...prevState,
        chartSubtitle: e.target.value,
        edited: true,
      }));
    }, 1000);

    setTypingTimeout(timeout);
  };

  const handleDataLabelsSwitch = (e) => {
    setState((prevState) => ({
      ...prevState,
      showLabels: e.target.checked,
      edited: true,
    }));
  };

  const handleDataLabelsBgSwitch = (e) => {
    setState((prevState) => ({
      ...prevState,
      showLabelsBackground: e.target.checked,
      edited: true,
    }));
  };

  const handleLabelsPosition = (e) => {
    setState((prevState) => ({
      ...prevState,
      labelsPosition: e.target.value,
      edited: true,
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        {chartConfiguration.showHideLegendAvailable && (
          <Grid item xs={12}>
            <FormControlLabel
              sx={{ mt: 1 }}
              label="Show legend"
              control={
                <Switch
                  checked={state.showLegend}
                  onChange={handleLegendSwitch}
                  color="primary"
                />
              }
            />
          </Grid>
        )}

        {chartConfiguration.legendPositionChangeable && (
          <Grid item xs={12}>
            <FormControl>
              <FormLabel id="role-label">Legend Position</FormLabel>
              <RadioGroup
                value={state.legendPosition}
                onChange={handleLegendPosition}
                row
              >
                {chartConfiguration.legendPositionTopAvailable && (
                  <FormControlLabel
                    label="Top"
                    control={<Radio value="top" />}
                  />
                )}
                {chartConfiguration.legendPositionRightAvailable && (
                  <FormControlLabel
                    label="Right"
                    control={<Radio value="right" />}
                  />
                )}
                {chartConfiguration.legendPositionBottomAvailable && (
                  <FormControlLabel
                    label="Bottom"
                    control={<Radio value="bottom" />}
                  />
                )}
                {chartConfiguration.legendPositionLeftAvailable && (
                  <FormControlLabel
                    label="Left"
                    control={<Radio value="left" />}
                  />
                )}
              </RadioGroup>
            </FormControl>
          </Grid>
        )}

        {chartConfiguration.showHideAxesAvailable && (
          <Grid item xs={12}>
            <FormControl>
              <FormLabel id="role-label">Axes</FormLabel>
              <FormGroup row>
                {chartConfiguration.showHideXAxisAvailable && (
                  <FormControlLabel
                    label="Horizontal"
                    control={
                      <Checkbox
                        onChange={handleXaxisChange}
                        checked={state.showXAxis}
                      />
                    }
                  />
                )}
                {chartConfiguration.showHideYAxisAvailable && (
                  <FormControlLabel
                    label="Vertical"
                    control={
                      <Checkbox
                        onChange={handleYaxisChange}
                        checked={state.showYAxis}
                      />
                    }
                  />
                )}
              </FormGroup>
            </FormControl>
          </Grid>
        )}

        <Grid item xs={12}>
          <Grid container spacing={2}>
            {chartConfiguration.chartTitleAvailable && (
              <Grid item xs={12}>
                <TextField
                  value={inputTitleValue}
                  onChange={handleChartTitle}
                  label="Chart title"
                  variant="outlined"
                  size="small"
                />
              </Grid>
            )}
            {chartConfiguration.chartSubtitleAvailable && (
              <Grid item xs={12}>
                <TextField
                  value={inputSubtitleValue}
                  onChange={handleChartSubTitle}
                  label="Chart subtitle"
                  variant="outlined"
                  size="small"
                />
              </Grid>
            )}
          </Grid>
        </Grid>
        {chartConfiguration.titleAndSubtitlePositionChangeable && (
          <Grid item xs={12}>
            <FormControl>
              <FormLabel>Title and Subtitle Position</FormLabel>
              <RadioGroup
                value={state.titleAndSubTitlePosition}
                onChange={handleTitlePosition}
                row
              >
                {chartConfiguration.titleAndSubtitlePositionLeftAvailable && (
                  <FormControlLabel
                    label="Left"
                    control={<Radio value="left" />}
                  />
                )}
                {chartConfiguration.titleAndSubtitlePositionCenterAvailable && (
                  <FormControlLabel
                    label="Center"
                    control={<Radio value="center" />}
                  />
                )}
                {chartConfiguration.titleAndSubtitlePositionRightAvailable && (
                  <FormControlLabel
                    label="Right"
                    control={<Radio value="right" />}
                  />
                )}
              </RadioGroup>
            </FormControl>
          </Grid>
        )}

        {(chartConfiguration.labelsPositionChangeable ||
          chartConfiguration.showHideLabelsAvailable) && (
          <Grid item xs={12}>
            <FormControl>
              <FormLabel>Data Labels</FormLabel>
              <FormGroup>
                {chartConfiguration.showHideLabelsAvailable && (
                  <FormControlLabel
                    sx={{ mt: 1 }}
                    label="Show labels"
                    control={
                      <Switch
                        checked={state.showLabels}
                        onChange={handleDataLabelsSwitch}
                        color="primary"
                      />
                    }
                  />
                )}
                {chartConfiguration.showHideLabelsBackgroundAvailable && (
                  <FormControlLabel
                    label="Show labels background"
                    control={
                      <Switch
                        checked={state.showLabelsBackground}
                        onChange={handleDataLabelsBgSwitch}
                        color="primary"
                      />
                    }
                  />
                )}
              </FormGroup>
            </FormControl>
          </Grid>
        )}

        {chartConfiguration.labelsPositionChangeable && (
          <Grid item xs={12}>
            <FormControl>
              <FormLabel>Labels Position</FormLabel>
              <RadioGroup
                value={state.labelsPosition}
                onChange={handleLabelsPosition}
                row
              >
                {chartConfiguration.labelsPositionTopAvailable && (
                  <FormControlLabel
                    label="Top"
                    control={<Radio value="top" />}
                  />
                )}
                {chartConfiguration.labelsPositionCenterAvailable && (
                  <FormControlLabel
                    label="Center"
                    control={<Radio value="center" />}
                  />
                )}
                {chartConfiguration.labelsPositionBottomAvailable && (
                  <FormControlLabel
                    label="Bottom"
                    control={<Radio value="bottom" />}
                  />
                )}
              </RadioGroup>
            </FormControl>
          </Grid>
        )}
      </Grid>
    </>
  );
};
