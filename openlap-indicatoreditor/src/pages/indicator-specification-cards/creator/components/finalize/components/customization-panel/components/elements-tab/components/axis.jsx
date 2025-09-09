import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
} from "@mui/material";

const Axis = ({ state, setState }) => {
  const handleChangeXAxis = (e) => {
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        xaxis: {
          ...p.options.xaxis,
          labels: {
            ...p.options.xaxis.labels,
            show: e.target.checked,
          },
        },
      },
    }));
  };

  const handleChangeYAxis = (e) => {
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        yaxis: {
          ...p.options.yaxis,
          labels: {
            ...p.options.yaxis.labels,
            show: e.target.checked,
          },
        },
      },
    }));
  };

  const handleShowYAxisTitle = (e) => {
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        yaxis: {
          ...p.options.yaxis,
          title: {
            ...p.options.yaxis.title,
            style: {
              ...p.options.yaxis.title.style,
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
    setState((p) => ({
      ...p,
      options: {
        ...p.options,
        xaxis: {
          ...p.options.xaxis,
          title: {
            ...p.options.xaxis.title,
            style: {
              ...p.options.xaxis.title.style,
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
      )}

      {state.configuration.isShowHideAxesTitleAvailable && (
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
              />
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
              />
            )}
          </FormGroup>
        </FormControl>
      )}
    </>
  );
};

export default Axis;
