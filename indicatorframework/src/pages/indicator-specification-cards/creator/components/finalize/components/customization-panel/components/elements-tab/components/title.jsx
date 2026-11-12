import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";

const Title = ({ state, setState }) => {
  const handleChartTitle = (e) => {
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        title: {
          ...p.options.title,
          text: e.target.value,
        },
      },
    }));
  };

  const handleTitlePosition = (e) => {
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        title: {
          ...p.options.title,
          align: e.target.value,
        },
        subtitle: {
          ...p.options.subtitle,
          align: e.target.value,
        },
      },
    }));
  };

  const handleChartSubTitle = (e) => {
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        subtitle: {
          ...p.options.subtitle,
          text: e.target.value,
        },
      },
    }));
  };

  return (
    <>
      {state.configuration.isChartTitleAvailable && (
        <TextField
          label="Chart title"
          variant="outlined"
          size="small"
          fullWidth
          value={state.options.title.text}
          onChange={handleChartTitle}
        />
      )}

      {state.configuration.isChartSubtitleAvailable && (
        <TextField
          label="Chart subtitle"
          fullWidth
          variant="outlined"
          size="small"
          value={state.options.subtitle.text}
          onChange={handleChartSubTitle}
        />
      )}

      {state.configuration.isTitleAndSubtitlePositionChangeable && (
        <FormControl>
          <FormLabel>Title and Subtitle Position</FormLabel>
          <RadioGroup
            value={state.options.title.align}
            onChange={handleTitlePosition}
            row
          >
            {state.configuration.isTitleAndSubtitlePositionLeftAvailable && (
              <FormControlLabel label="Left" control={<Radio value="left" />} />
            )}
            {state.configuration.isTitleAndSubtitlePositionCenterAvailable && (
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
      )}
    </>
  );
};

export default Title;
