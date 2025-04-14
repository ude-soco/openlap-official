import React from "react";
import Grid from "@mui/material/Grid2";
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
} from "@mui/material";

const Axis = ({ state, setState }) => {
  const handleChangeXAxis = (e) => {
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
  };

  const handleChangeYAxis = (e) => {
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

  const handleShowYAxisTitle = (e) => {
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
              cssClass: e.target.checked
                ? "x-y-axis-show-title"
                : "x-y-axis-hide-title",
            },
          },
        },
      },
    }));
  };

  const handleShowXAxisTitle = (e) => {
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
              cssClass: e.target.checked
                ? "x-y-axis-show-title"
                : "x-y-axis-hide-title",
            },
          },
        },
      },
    }));
  };

  return (
    <>
      {state.configuration.isShowHideAxesAvailable && (
        <Grid size={12}>
          <FormControl>
            <FormLabel id="role-label">Axes</FormLabel>
            <FormGroup row>
              {state.configuration.isShowHideYAxisAvailable && (
                <FormControlLabel
                  label="Vertical"
                  control={
                    <Checkbox
                      onChange={handleChangeYAxis}
                      checked={state.options.yaxis.labels.show}
                    />
                  }
                ></FormControlLabel>
              )}
              {state.configuration.isShowHideXAxisAvailable && (
                <FormControlLabel
                  label="Horizontal"
                  control={
                    <Checkbox
                      onChange={handleChangeXAxis}
                      checked={state.options.xaxis.labels.show}
                    />
                  }
                ></FormControlLabel>
              )}
            </FormGroup>
          </FormControl>
        </Grid>
      )}

      {state.configuration.isShowHideAxesTitleAvailable && (
        <Grid size={12}>
          <FormControl>
            <FormLabel id="role-label">Axes Titles</FormLabel>
            <FormGroup row>
              {state.configuration.isShowHideYAxisTitleAvailable && (
                <FormControlLabel
                  label="Vertical"
                  control={
                    <Checkbox
                      onChange={handleShowYAxisTitle}
                      checked={
                        state.options.yaxis.title.style.cssClass ===
                        "x-y-axis-show-title"
                      }
                    />
                  }
                ></FormControlLabel>
              )}

              {state.configuration.isShowHideXAxisTitleAvailable && (
                <FormControlLabel
                  label="Horizontal"
                  control={
                    <Checkbox
                      onChange={handleShowXAxisTitle}
                      checked={
                        state.options.xaxis.title.style.cssClass ===
                        "x-y-axis-show-title"
                      }
                    />
                  }
                ></FormControlLabel>
              )}
            </FormGroup>
          </FormControl>
        </Grid>
      )}
    </>
  );
};

export default Axis;
