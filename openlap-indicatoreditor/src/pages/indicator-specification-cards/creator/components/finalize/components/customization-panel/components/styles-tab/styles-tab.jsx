import { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Stack,
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
      setState((p) => ({
        ...p,
        options: {
          ...p.options,
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

        setState((p) => ({ ...p, series: updatedSeries }));
      } else if (state.options.markers.colors[0]) {
        setState((p) => ({
          ...p,
          options: {
            ...p.options,
            colors: [e.target.value],
            markers: { ...p.options.markers, colors: [e.target.value] },
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
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        legend: {
          ...p.options.legend,
          labels: {
            ...p.options.legend.labels,
            useSeriesColors: e.target.checked,
          },
        },
      },
    }));
  };

  const handleDataLabelsColor = (e) => {
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        dataLabels: {
          ...p.options.dataLabels,
          style: {
            ...p.options.dataLabels.style,
            colors: [e.target.value],
          },
        },
      },
    }));
  };

  const handleDataLabelsBgColor = (e) => {
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        dataLabels: {
          ...p.options.dataLabels,
          background: {
            ...p.options.dataLabels.background,
            foreColor: e.target.value,
          },
        },
      },
    }));
  };
  return (
    <>
      <Stack gap={2}>
        {state.configuration.isSeriesColorChangeable && (
          <FormControl>
            <FormLabel sx={{ mb: 1 }} id="role-label">
              Data Colors
            </FormLabel>
            {state.configuration.isSeriesSingleColor && (
              <>
                <Box className="color-box">
                  <input
                    type="color"
                    value={
                      state.series[0]?.color || state.options.markers.colors[0]
                    }
                    onChange={(e) => handleColorChange(null, e)}
                  />
                </Box>
                <Typography>{state.series[0]?.name}</Typography>
              </>
            )}

            {state.configuration.isSeriesMultipleColor &&
              tempColLabels.map((label, index) => (
                <Stack direction="row" key={index} container gap={1}>
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
                  <Typography style={{ marginTop: "5px" }} variant="body">
                    {label.label}
                  </Typography>
                </Stack>
              ))}
          </FormControl>
        )}

        {state.configuration.isLegendTextColorAvailable && (
          <Stack>
            <FormControl>
              <FormLabel id="role-label">Legend Text Color</FormLabel>
            </FormControl>
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
          </Stack>
        )}

        {(state.configuration.isDataLabelsColorAvailable ||
          state.configuration.isDataLabelsWithBackgroundColorAvailable) && (
          <FormControl>
            <FormLabel sx={{ mb: 1 }} id="role-label">
              Data Labels
            </FormLabel>
            <Stack gap={1}>
              {state.configuration.isDataLabelsColorAvailable && (
                <Stack direction="row" gap={1}>
                  <Box className="color-box">
                    <input
                      type="color"
                      value={state.options.dataLabels.style.colors[0]}
                      onChange={handleDataLabelsColor}
                    />
                  </Box>
                  <Typography style={{ marginTop: "5px" }} variant="body">
                    Data labels color
                  </Typography>
                </Stack>
              )}

              {state.configuration.isDataLabelsWithBackgroundColorAvailable && (
                <Stack direction="row" gap={1}>
                  <Box className="color-box">
                    <input
                      type="color"
                      value={state.options.dataLabels.background.foreColor}
                      onChange={handleDataLabelsBgColor}
                    />
                  </Box>
                  <Typography>
                    Data labels fore color
                    <br />
                    (when background activated)
                  </Typography>
                </Stack>
              )}
            </Stack>
          </FormControl>
        )}
      </Stack>
    </>
  );
};

export default StylesTab;
