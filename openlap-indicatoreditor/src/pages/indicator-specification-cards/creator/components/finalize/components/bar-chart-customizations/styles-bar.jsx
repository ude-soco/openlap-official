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

export const StylesBar = () => {
  const { state, setState, chartRef } = useContext(StateContext);

  function handleColorChange(e) {
    const updatedSeries = state.series.map((item, index) =>
      index === 0 ? { ...item, color: e.target.value } : item
    );

    setState((prevState) => ({
      ...prevState,
      series: updatedSeries,
    }));
  }

  function handleUseSeriesColors(e) {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        legend: {
          ...prevState.options.legend,
          labels: {
            ...prevState.options.legend.labels,
            useSeriesColors: e.target.checked,
          },
        },
      },
    }));
  }

  function handleDataLabelsColor(e) {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        dataLabels: {
          ...prevState.options.dataLabels,
          style: {
            ...prevState.options.dataLabels.style,
            colors: [e.target.value],
          },
        },
      },
    }));
  }

  function handleDataLabelsBgColor(e) {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        dataLabels: {
          ...prevState.options.dataLabels,
          background: {
            ...prevState.options.dataLabels.background,
            foreColor: e.target.value,
          },
        },
      },
    }));
  }

  return (
    <>
      <Stack>
        <Stack mb={1} spacing={2}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            DATA COLORS
          </Typography>

          <Stack direction="row" spacing={1}>
            <Typography style={{ marginTop: "5px" }} variant="body">
              {state.series[0].name}
            </Typography>
            <Box mb={0} height="30px" width="30px">
              <input
                type="color"
                value={state.series[0].color}
                onChange={handleColorChange}
                style={{
                  cursor: "pointer",
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: "5px",
                }}
              />
            </Box>
          </Stack>
        </Stack>

        <Stack mb={1} spacing={1}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            LEGEND COLOR
          </Typography>
          <FormControlLabel
            label="Use series colors"
            control={
              <Switch
                checked={state.options.legend.labels.useSeriesColors}
                onChange={handleUseSeriesColors}
                size="small"
                color="primary"
              />
            }
          />
        </Stack>

        <Stack mb={1} spacing={2}>
          <Typography variant="h6" fontSize="small" fontWeight="800">
            DATA LABELS
          </Typography>

          <Stack direction="row" spacing={1}>
            <Typography style={{ marginTop: "5px" }} variant="body">
              Data labels color
            </Typography>
            <Box mb={0} height="30px" width="30px">
              <input
                type="color"
                value={state.options.dataLabels.style.colors[0]}
                onChange={handleDataLabelsColor}
                style={{
                  cursor: "pointer",
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: "5px",
                }}
              />
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Typography style={{ marginTop: "5px" }} variant="body">
              Data labels fore color
              <br />
              (when background activated)
            </Typography>
            <Box mb={0} height="30px" width="30px">
              <input
                type="color"
                value={state.options.dataLabels.foreColor}
                onChange={handleDataLabelsBgColor}
                style={{
                  cursor: "pointer",
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: "5px",
                }}
              />
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </>
  );
};
