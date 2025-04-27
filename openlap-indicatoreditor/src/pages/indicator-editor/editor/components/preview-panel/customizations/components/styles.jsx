import { useState } from "react";
import { Box, FormControl, FormLabel, Grid, Typography } from "@mui/material";

export const StylesBar = ({
  categories,
  state,
  setState,
  chartConfiguration,
}) => {
  const [inputColors, setInputColors] = useState(state.colorsArray);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [tempColLabels, settempColLabels] = useState(
    categories.map((label, index) => ({
      label,
      color: inputColors[index] || "#008ffb", // Handle cases where colors array has fewer items
    }))
  );

  const handleSingleSeriesColorChange = (e) => {
    // const newValue = e.target.value;
    const arrayColor = [];
    arrayColor.push(e.target.value);

    setInputColors(arrayColor); // Update input field immediately

    // Clear the existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set a new timeout
    const timeout = setTimeout(() => {
      setState((prevState) => ({
        ...prevState,
        colorsArray: [e.target.value],
        edited: true,
      }));
    }, 2000); // Adjust delay as needed (e.g., 500ms)

    setTypingTimeout(timeout);
  };

  const handleMultipleSeriesColorChange = (index, e) => {
    const updatedColors = tempColLabels.map((labcol, i) =>
      i === index ? { ...labcol, color: e.target.value } : labcol
    );
    settempColLabels(updatedColors);

    // Clear the existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set a new timeout
    const timeout = setTimeout(() => {
      setState((prevState) => {
        const newColors = [...prevState.colorsArray];
        newColors[index] = e.target.value;
        return {
          ...prevState,
          colorsArray: newColors,
          edited: true,
        };
      });
    }, 2000); // Adjust delay as needed (e.g., 500ms)

    setTypingTimeout(timeout);
  };

  return (
    <>
      {/* <Grid container spacing={2}>
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
                      value={state.options.series[0]?.color}
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
                    {state.options.series[0]?.name}
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
      </Grid> */}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container sx={{ mt: 1 }}>
            <FormControl>
              <FormLabel sx={{ mb: 1 }} id="role-label">
                Data Colors
              </FormLabel>
              <Grid item xs={12}>
                {chartConfiguration.seriesSingleColor && (
                  <Grid container spacing={1} item>
                    <Grid item>
                      <Box sx={{ mb: 0, height: 30, width: 30 }}>
                        <input
                          type="color"
                          value={inputColors[0]}
                          onChange={handleSingleSeriesColorChange}
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
                        Series
                      </Typography>
                    </Grid>
                  </Grid>
                )}

                {chartConfiguration.seriesMultipleColor &&
                  tempColLabels.map((label, index) => (
                    <Grid key={index} container spacing={1} item>
                      <Grid item>
                        <Box sx={{ mb: 0, height: 30, width: 30 }}>
                          <input
                            type="color"
                            value={label.color}
                            onChange={(e) =>
                              handleMultipleSeriesColorChange(index, e)
                            }
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
              </Grid>
            </FormControl>
          </Grid>
        </Grid>

        {/* <Grid item xs={12}>
          <FormControl>
            <FormLabel id="role-label">Legend Text Color</FormLabel>
          </FormControl>
          <Grid item>
            <FormControlLabel
              label="Use series colors"
              control={<Switch color="primary" />}
            />
          </Grid>
        </Grid> */}

        {/* <Grid item xs={12}>
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
        </Grid> */}
      </Grid>
    </>
  );
};
