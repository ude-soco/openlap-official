import React from "react";
import Grid from "@mui/material/Grid2";
import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";

const Title = ({ state, setState }) => {
  const handleChartTitle = (e) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        title: {
          ...prevState.options.title,
          text: e.target.value,
        },
      },
    }));
  };

  const handleTitlePosition = (e) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        title: {
          ...prevState.options.title,
          align: e.target.value,
        },
      },
    }));
  };

  const handleChartSubTitle = (e) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        subtitle: {
          ...prevState.options.subtitle,
          text: e.target.value,
        },
      },
    }));
  };

  return (
    <>
      <Grid size={12}>
        <Grid container spacing={2}>
          {state.configuration.isChartTitleAvailable && (
            <Grid size={12}>
              <TextField
                label="Chart title"
                variant="outlined"
                size="small"
                fullWidth
                value={state.options.title.text}
                onChange={handleChartTitle}
              />
            </Grid>
          )}

          {state.configuration.isChartSubtitleAvailable && (
            <Grid size={12}>
              <TextField
                label="Chart subtitle"
                fullWidth
                variant="outlined"
                size="small"
                value={state.options.subtitle.text}
                onChange={handleChartSubTitle}
              />
            </Grid>
          )}
        </Grid>
      </Grid>

      {state.configuration.isTitleAndSubtitlePositionChangeable && (
        <Grid size={12}>
          <FormControl>
            <FormLabel>Title and Subtitle Position</FormLabel>
            <RadioGroup
              value={state.options.title.align}
              onChange={handleTitlePosition}
              row
            >
              {state.configuration.isTitleAndSubtitlePositionLeftAvailable && (
                <FormControlLabel
                  label="Left"
                  control={<Radio value="left" />}
                />
              )}
              {state.configuration
                .isTitleAndSubtitlePositionCenterAvailable && (
                <FormControlLabel
                  label="Center"
                  control={<Radio value="center" />}
                />
              )}
              {state.configuration.isTitleAndSubtitlePositionRightAvailable && (
                <FormControlLabel
                  label="Right"
                  control={<Radio value="right" />}
                />
              )}
            </RadioGroup>
          </FormControl>
        </Grid>
      )}
    </>
  );
};

export default Title;
