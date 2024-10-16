import {
  Stack,
  Typography,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  Button,
  FormLabel,
  FormControl,
  TextField,
  Checkbox,
  Box,
  Grid,
  FormGroup,
} from "@mui/material";
import { useContext, useEffect } from "react";
import { StateContext } from "../stacked-bar-chart";

export const ElementsStacked = () => {
  const { state, setState, chartRef } = useContext(StateContext);

  const handleLegendSwitch = (event) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        legend: {
          ...prevState.options.legend,
          show: event.target.checked,
        },
      },
    }));
  };

  const handleLegendPosition = (event) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        legend: {
          ...prevState.options.legend,
          position: event.target.value,
        },
      },
    }));
  };

  const handleXaxisChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        xaxis: {
          ...prevState.options.xaxis,
          labels: {
            ...prevState.options.xaxis.labels,
            show: event.target.checked,
          },
        },
      },
    }));
  };

  const handleYaxisChange = (e) => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        yaxis: {
          ...prevState.options.yaxis,
          labels: {
            ...prevState.options.yaxis.labels,
            show: e.target.checked,
          },
        },
      },
    }));
  };

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

  const handleshowYaxisTitle = (e) => {
    if (e.target.checked) {
      setState((prevState) => ({
        ...prevState,
        options: {
          ...prevState.options,
          yaxis: {
            ...prevState.options.yaxis,
            title: {
              ...prevState.options.yaxis.title,
              style: {
                ...prevState.options.yaxis.title.style,
                cssClass: "x-y-axis-show-title",
              },
            },
          },
        },
      }));
    } else {
      setState((prevState) => ({
        ...prevState,
        options: {
          ...prevState.options,
          yaxis: {
            ...prevState.options.yaxis,
            title: {
              ...prevState.options.yaxis.title,
              style: {
                ...prevState.options.yaxis.title.style,
                cssClass: "x-y-axis-hide-title",
              },
            },
          },
        },
      }));
    }
  };

  const handleshowXaxisTitle = (e) => {
    if (e.target.checked) {
      setState((prevState) => ({
        ...prevState,
        options: {
          ...prevState.options,
          xaxis: {
            ...prevState.options.xaxis,
            title: {
              ...prevState.options.xaxis.title,
              style: {
                ...prevState.options.xaxis.title.style,
                cssClass: "x-y-axis-show-title",
              },
            },
          },
        },
      }));
    } else {
      setState((prevState) => ({
        ...prevState,
        options: {
          ...prevState.options,
          xaxis: {
            ...prevState.options.xaxis,
            title: {
              ...prevState.options.xaxis.title,
              style: {
                ...prevState.options.xaxis.title.style,
                cssClass: "x-y-axis-hide-title",
              },
            },
          },
        },
      }));
    }
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
        subtitle: {
          ...prevState.options.subtitle,
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
      <Grid container spacing={2}>
        <Grid item xs={12}>
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

        <Grid item xs={12}>
          <FormControl>
            <FormLabel id="role-label">Legend Position</FormLabel>
            <RadioGroup
              value={state.options.legend.position}
              onChange={handleLegendPosition}
              row
            >
              <FormControlLabel label="Top" control={<Radio value="top" />} />
              <FormControlLabel
                label="Right"
                control={<Radio value="right" />}
              />
              <FormControlLabel
                label="Bottom"
                control={<Radio value="bottom" />}
              />
              <FormControlLabel label="Left" control={<Radio value="left" />} />
            </RadioGroup>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControl>
            <FormLabel id="role-label">Axes</FormLabel>
            <FormGroup row>
              <FormControlLabel
                label="Vertical"
                control={
                  <Checkbox
                    onChange={handleYaxisChange}
                    checked={state.options.yaxis.labels.show}
                  />
                }
              ></FormControlLabel>
              <FormControlLabel
                label="Horizontal"
                control={
                  <Checkbox
                    onChange={handleXaxisChange}
                    checked={state.options.xaxis.labels.show}
                  />
                }
              ></FormControlLabel>
            </FormGroup>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControl>
            <FormLabel id="role-label">Axes Titles</FormLabel>
            <FormGroup row>
              <FormControlLabel
                label="Vertical"
                control={
                  <Checkbox
                    onChange={handleshowYaxisTitle}
                    checked={
                      state.options.yaxis.title.style.cssClass ===
                      "x-y-axis-show-title"
                        ? true
                        : false
                    }
                  />
                }
              ></FormControlLabel>
              <FormControlLabel
                label="Horizontal"
                control={
                  <Checkbox
                    onChange={handleshowXaxisTitle}
                    checked={
                      state.options.xaxis.title.style.cssClass ===
                      "x-y-axis-show-title"
                        ? true
                        : false
                    }
                  />
                }
              ></FormControlLabel>
            </FormGroup>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Chart title"
                variant="outlined"
                size="small"
                value={state.options.title.text}
                onChange={handleChartTitle}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Chart subtitle"
                variant="outlined"
                size="small"
                value={state.options.subtitle.text}
                onChange={handleChartSubTitle}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <FormControl>
            <FormLabel>Title and Subtitle Position</FormLabel>
            <RadioGroup
              value={state.options.title.align}
              onChange={handleTitlePosition}
              row
            >
              <FormControlLabel label="Left" control={<Radio value="left" />} />
              <FormControlLabel
                label="Center"
                control={<Radio value="center" />}
              />
              <FormControlLabel
                label="Right"
                control={<Radio value="right" />}
              />
            </RadioGroup>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControl>
            <FormLabel>Data Labels</FormLabel>
            <FormGroup>
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
            </FormGroup>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl>
            <FormLabel>Labels Position</FormLabel>
            <RadioGroup
              value={state.options.plotOptions.bar.dataLabels.position}
              onChange={handleLabelsPosition}
              row
            >
              <FormControlLabel
                label="Top"
                control={<Radio value="top" />}
              ></FormControlLabel>
              <FormControlLabel
                label="Center"
                control={<Radio value="center" />}
              ></FormControlLabel>
            </RadioGroup>
          </FormControl>
        </Grid>
      </Grid>
    </>
  );
};
