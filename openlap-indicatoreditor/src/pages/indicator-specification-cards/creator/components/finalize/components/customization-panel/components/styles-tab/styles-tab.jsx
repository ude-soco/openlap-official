import React, { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Switch,
  Typography,
} from "@mui/material";
import "./styles-tab.css";
import ApexCharts from "apexcharts";

const StylesTab = ({ state, setState }) => {
  const chartInstance = ApexCharts.getChartByID(state.options.chart.id);

  const chartColors = chartInstance.w.globals.colors;

  const [tempColLabels, settempColLabels] = useState(
    state.configuration.isSeriesMultipleColor &&
      state.options.labels?.length > 0
      ? state.options.labels.map((label, index) => ({
          label,
          color: chartColors[index] || state.options.colors[index], // Handle cases where colors array has fewer items
        }))
      : state.configuration.isSeriesMultipleColor &&
        (state.options.labels?.length == 0 || !state.options.labels)
      ? state.series.map((label, index) => ({
          label: label.name,
          color: state.configuration.isSeriesMultipleColor
            ? state.options.colors[index] || chartColors[index]
            : null, // Handle cases where colors array has fewer items
        }))
      : null
  );

  useEffect(() => {
    if (state.configuration.isSeriesMultipleColor) {
      setState((prevState) => ({
        ...prevState,
        options: {
          ...prevState.options,
          colors: tempColLabels.map((label) => {
            const colorValue = label.color || "#CCCCCC"; // Provide a default fallback color
            return typeof colorValue === "string"
              ? colorValue.toUpperCase()
              : "#CCCCCC"; // Ensure it's a string
          }),
        },
      }));
    }
  }, [tempColLabels]);

  const handleColorChange = (index = null, e) => {
    if (state.configuration.isSeriesSingleColor) {
      if (state.series[0]?.color) {
        const updatedSeries = state.series.map((item, index) =>
          index === 0 ? { ...item, color: e.target.value } : item
        );

        setState((prevState) => ({
          ...prevState,
          series: updatedSeries,
        }));
      } else if (state.options.markers.colors[0]) {
        setState((prevState) => ({
          ...prevState,
          options: {
            ...prevState.options,
            colors: [e.target.value],
            markers: {
              ...prevState.options.markers,
              colors: [e.target.value],
            },
          },
        }));
      }
    } else if (state.configuration.isSeriesMultipleColor) {
      const updatedColors = tempColLabels.map((labcol, i) =>
        i === index ? { ...labcol, color: e.target.value } : labcol
      );
      settempColLabels(updatedColors);
    }
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
        {state.configuration.isSeriesColorChangeable && (
          <Grid item xs={12}>
            <Grid container sx={{ mt: 1 }}>
              <FormControl>
                <FormLabel sx={{ mb: 1 }} id="role-label">
                  Data Colors
                </FormLabel>
                {state.configuration.isSeriesSingleColor && (
                  <Grid container spacing={1} item>
                    <Grid item>
                      <Box className="color-box">
                        <input
                          type="color"
                          value={
                            state.series[0]?.color ||
                            state.options.markers.colors[0]
                          }
                          onChange={(e) => handleColorChange(null, e)}
                        />
                      </Box>
                    </Grid>
                    <Grid item>
                      <Typography>{state.series[0]?.name}</Typography>
                    </Grid>
                  </Grid>
                )}

                {state.configuration.isSeriesMultipleColor &&
                  tempColLabels.map((label, index) => (
                    <Grid key={index} container spacing={1} item>
                      <Grid item>
                        <Box sx={{ mb: 0, height: 30, width: 30 }}>
                          <input
                            type="color"
                            value={label.color}
                            onChange={(e) => handleColorChange(index, e)}
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
                      <Grid sx={{ mt: 0.5 }} item>
                        <Typography style={{ marginTop: "5px" }} variant="body">
                          {label.label}
                        </Typography>
                      </Grid>
                    </Grid>
                  ))}
              </FormControl>
            </Grid>
          </Grid>
        )}

        {state.configuration.isLegendTextColorAvailable && (
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
        )}

        {(state.configuration.isDataLabelsColorAvailable ||
          state.configuration.isDataLabelsWithBackgroundColorAvailable) && (
          <Grid item xs={12}>
            <Grid container>
              <FormControl>
                <FormLabel sx={{ mb: 1 }} id="role-label">
                  Data Labels
                </FormLabel>
                {state.configuration.isDataLabelsColorAvailable && (
                  <Grid container spacing={1}>
                    <Grid item>
                      <Box className="color-box">
                        <input
                          type="color"
                          value={state.options.dataLabels.style.colors[0]}
                          onChange={handleDataLabelsColor}
                        />
                      </Box>
                    </Grid>
                    <Grid item>
                      <Typography style={{ marginTop: "5px" }} variant="body">
                        Data labels color
                      </Typography>
                    </Grid>
                  </Grid>
                )}

                {state.configuration
                  .isDataLabelsWithBackgroundColorAvailable && (
                  <Grid container spacing={1}>
                    <Grid item>
                      <Box className="color-box">
                        <input
                          type="color"
                          value={state.options.dataLabels.background.foreColor}
                          onChange={handleDataLabelsBgColor}
                        />
                      </Box>
                    </Grid>
                    <Grid item>
                      <Typography>
                        Data labels fore color
                        <br />
                        (when background activated)
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              </FormControl>
            </Grid>
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default StylesTab;
