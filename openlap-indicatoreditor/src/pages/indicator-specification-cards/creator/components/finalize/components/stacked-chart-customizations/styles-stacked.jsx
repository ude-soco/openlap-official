import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Switch,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { StateContext } from "../stacked-bar-chart";

export const StylesStacked = () => {
  const { state, setState, chartRef } = useContext(StateContext);
  const chartInstance = chartRef.current.chart;
  const chartColors = chartInstance.w.globals.colors;

  const [tempColLabels, settempColLabels] = useState(
    state.series.map((label, index) => ({
      label: label.name,
      color: state.options.colors[index] || chartColors[index], // Handle cases where colors array has fewer items
    }))
  );

  function handleColorChange(index, e) {
    const updatedColors = tempColLabels.map(function (labcol, i) {
      return i === index ? { ...labcol, color: e.target.value } : labcol;
    });
    settempColLabels(updatedColors);
  }

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

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: tempColLabels.map((label) => label.color),
      },
    }));
  }, [tempColLabels]);

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container sx={{ mt: 1 }}>
            <FormControl>
              <FormLabel sx={{ mb: 1 }} id="role-label">
                Data Colors
              </FormLabel>
              {tempColLabels.map((label, index) => (
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
                  <Grid item>
                    <Typography style={{ marginTop: "5px" }} variant="body">
                      {label.label}
                    </Typography>
                  </Grid>
                </Grid>
              ))}
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
