import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Switch,
  Typography,
} from "@mui/material";
import { useContext, useEffect } from "react";
import ApexCharts from "apexcharts";
import { StateContext } from "../bar-chart";

export const StylesBar = () => {
  const { state, setState, chartRef } = useContext(StateContext);

  const handleColorChange = (e) => {
    const updatedSeries = state.series.map((item, index) =>
      index === 0 ? { ...item, color: e.target.value } : item
    );

    setState((prevState) => ({
      ...prevState,
      series: updatedSeries,
    }));
  };

  const handleUseSeriesColors = (e) => {
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
  };

  const handleDataLabelsColor = (e) => {
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
  };

  const handleDataLabelsBgColor = (e) => {
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
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container sx={{ mt: 1 }}>
            <FormControl>
              <FormLabel sx={{ mb: 1 }} id="role-label">
                Data Colors
              </FormLabel>
              <Grid container spacing={1} item>
                <Grid item>
                  <Box sx={{ mb: 0, height: 30, width: 30 }}>
                    <input
                      type="color"
                      value={state.series[0]?.color}
                      onChange={handleColorChange}
                      style={{
                        cursor: "pointer",
                        width: "100%",
                        height: "100%",
                        outline: "none",
                        background: "none",
                        border: "none",
                        borderRadius: "5px",
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item>
                  <Typography style={{ marginTop: "5px" }} variant="body">
                    {state.series[0]?.name}
                  </Typography>
                </Grid>
              </Grid>
            </FormControl>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <FormControl>
            <FormLabel id="role-label">Legend Text Color</FormLabel>
          </FormControl>
          <Grid item>
            <FormControlLabel
              label="Use series colors"
              control={
                <Switch
                  checked={state.options.legend.labels.useSeriesColors}
                  onChange={handleUseSeriesColors}
                  color="primary"
                />
              }
            />
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Grid container>
            <FormControl>
              <FormLabel sx={{ mb: 1 }} id="role-label">
                Data Labels
              </FormLabel>
              <Grid container spacing={1}>
                <Grid item>
                  <Box sx={{ mb: 0, height: 30, width: 30 }}>
                    <input
                      type="color"
                      value={state.options.dataLabels.style.colors[0]}
                      onChange={handleDataLabelsColor}
                      style={{
                        cursor: "pointer",
                        width: "100%",
                        height: "100%",
                        outline: "none",
                        background: "none",
                        border: "none",
                        borderRadius: "5px",
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item>
                  <Typography style={{ marginTop: "5px" }} variant="body">
                    Data labels color
                  </Typography>
                </Grid>
              </Grid>

              <Grid container spacing={1}>
                <Grid item>
                  <Box sx={{ mb: 0, height: 30, width: 30 }}>
                    <input
                      type="color"
                      value={state.options.dataLabels.background.foreColor}
                      onChange={handleDataLabelsBgColor}
                      style={{
                        cursor: "pointer",
                        width: "100%",
                        height: "100%",
                        outline: "none",
                        background: "none",
                        border: "none",
                        borderRadius: "5px",
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item>
                  <Typography style={{ marginTop: "5px" }} variant="body">
                    Data labels fore color
                    <br />
                    (when background activated)
                  </Typography>
                </Grid>
              </Grid>
            </FormControl>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};
