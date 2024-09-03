import {
  Stack,
  Typography,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  Button,
  FormControl,
  TextField,
  Checkbox,
  Box,
  FormGroup,
} from "@mui/material";
import { useContext, useEffect } from "react";
import ApexCharts from "apexcharts";
import { StateContext } from "../bar-chart";

export const ElementsBar = () => {
  const { state, setState, chartRef } = useContext(StateContext);

  function handleLegendSwitch(e) {
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
  }

  function handleLegendPosition(e) {
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
  }

  function handleXaxisChange(e) {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        xaxis: {
          ...prevState.options.xaxis,
          labels: {
            ...prevState.options.xaxis.labels,
            show: e.target.checked,
          },
        },
      },
    }));
  }

  function handleYaxisChange(e) {
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
  }

  function handleshowYaxisTitle(e) {
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
  }

  function handleshowXaxisTitle(e) {
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
  }

  function handleChartTitle(e) {
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
  }

  function handleTitlePosition(e) {
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
  }

  function handleChartSubTitle(e) {
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
  }

  function handleSubtitlePosition(e) {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        subtitle: {
          ...prevState.options.subtitle,
          align: e.target.value,
        },
      },
    }));
  }

  function handleDataLabelsSwitch(e) {
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
  }

  function handleDataLabelsBgSwitch(e) {
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
  }

  function handleLabelsPosition(e) {
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
  }

  //   function handleZoomIn() {
  //     const chart = chartRef.current.chart;
  //     const xAxisMin = chart.w.globals.minX;
  //     const xAxisMax = chart.w.globals.maxX;
  //     const newMin = xAxisMin + (xAxisMax - xAxisMin) * 0.1;
  //     const newMax = xAxisMax - (xAxisMax - xAxisMin) * 0.1;

  //     ApexCharts.exec(state.options.chart.id, "zoomX", newMin, newMax);
  //   }

  //   function handleZoomOut() {
  //     const chart = chartRef.current.chart;
  //     const xAxisMin = chart.w.globals.minX;
  //     const xAxisMax = chart.w.globals.maxX;
  //     const newMin = xAxisMin - (xAxisMax - xAxisMin) * 0.1;
  //     const newMax = xAxisMax + (xAxisMax - xAxisMin) * 0.1;

  //     ApexCharts.exec(state.options.chart.id, "zoomX", newMin, newMax);
  //   }

  //   Beginning of JSX
  return (
    <>
      <Stack>
        <Stack mb={1} spacing={1}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            LEGEND
          </Typography>
          <FormControlLabel
            label="Show legend"
            control={
              <Switch
                checked={state.options.legend.show}
                onChange={handleLegendSwitch}
                size="small"
                color="primary"
              />
            }
          />
        </Stack>

        <Stack mb={1} spacing={1}>
          <Typography variant="body" fontSize="small">
            LEGEND POSITION
          </Typography>
          <FormControl>
            <RadioGroup
              value={state.options.legend.position}
              onChange={handleLegendPosition}
              row
            >
              <FormControlLabel
                label="Top"
                control={<Radio value="top" />}
              ></FormControlLabel>
              <FormControlLabel
                label="Right"
                control={<Radio value="right" />}
              ></FormControlLabel>
              <FormControlLabel
                label="Bottom"
                control={<Radio value="bottom" />}
              ></FormControlLabel>
              <FormControlLabel
                label="Left"
                control={<Radio value="left" />}
              ></FormControlLabel>
            </RadioGroup>
          </FormControl>
        </Stack>

        <Stack mb={1} spacing={1}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            AXES
          </Typography>
          <FormControl>
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
        </Stack>

        <Stack mb={1} spacing={1}>
          <Typography variant="body" fontSize="small">
            AXES TITLES
          </Typography>
          <FormControl>
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
        </Stack>

        <Stack mb={1} spacing={2}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            CHART TITLE
          </Typography>
          <TextField
            label="Chart title"
            variant="outlined"
            size="small"
            value={state.options.title.text}
            onChange={handleChartTitle}
          />

          <Typography variant="body" fontSize="small">
            TITLE POSITION
          </Typography>
          <FormControl>
            <RadioGroup
              value={state.options.title.align}
              onChange={handleTitlePosition}
              row
            >
              <FormControlLabel
                label="Left"
                control={<Radio value="left" />}
              ></FormControlLabel>
              <FormControlLabel
                label="Center"
                control={<Radio value="center" />}
              ></FormControlLabel>
              <FormControlLabel
                label="Right"
                control={<Radio value="right" />}
              ></FormControlLabel>
            </RadioGroup>
          </FormControl>
        </Stack>

        <Stack mb={1} spacing={2}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            CHART SUBTITLE
          </Typography>
          <TextField
            label="Chart subtitle"
            variant="outlined"
            size="small"
            value={state.options.subtitle.text}
            onChange={handleChartSubTitle}
          />

          <Typography variant="body" fontSize="small">
            SUBTITLE POSITION
          </Typography>
          <FormControl>
            <RadioGroup
              value={state.options.subtitle.align}
              onChange={handleSubtitlePosition}
              row
            >
              <FormControlLabel
                label="Left"
                control={<Radio value="left" />}
              ></FormControlLabel>
              <FormControlLabel
                label="Center"
                control={<Radio value="center" />}
              ></FormControlLabel>
              <FormControlLabel
                label="Right"
                control={<Radio value="right" />}
              ></FormControlLabel>
            </RadioGroup>
          </FormControl>
        </Stack>

        <Stack mb={1} spacing={2}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            DATA LABELS
          </Typography>
          <FormControlLabel
            label="Show labels"
            control={
              <Switch
                size="small"
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
                size="small"
                color="primary"
                checked={state.options.dataLabels.background.enabled}
                onChange={handleDataLabelsBgSwitch}
              />
            }
          />
          <Typography variant="body" fontSize="small">
            LABELS POSITION
          </Typography>
          <FormControl>
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
        </Stack>

        {/* <Stack mb={1} spacing={2}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            ZOOM
          </Typography>

          <Stack direction="row" spacing={1}>
            <Box width="50%">
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleZoomIn}
                style={{ width: "100%" }}
              >
                Zoom in
              </Button>
            </Box>
            <Box width="50%">
              <Button
                onClick={handleZoomOut}
                variant="contained"
                color="primary"
                size="small"
                style={{ width: "100%" }}
              >
                Zoom out
              </Button>
            </Box>
          </Stack>
        </Stack> */}
      </Stack>
    </>
  );
};
