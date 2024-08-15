import React, { useEffect } from "react";
import { Box, Button, Grid, Paper, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";

const IndicatorCard = ({ indicator, selectedIndicator, handleSelection }) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.innerHTML = indicator.scriptData;
    document.getElementById("root").appendChild(script);
    return () => {
      document.getElementById("root").removeChild(script);
    };
  }, [indicator.scriptData]);

  return (
    <>
      <Grid
        container
        component={Paper}
        direction="column"
        spacing={1}
        variant="outlined"
        sx={{ flex: 1, p: 2 }}
      >
        <Grid item xs>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="h6">{indicator.name}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid
                container
                justifyContent="center"
                sx={{ backgroundColor: "white", borderRadius: 2 }}
              >
                <Box>{indicator.displayCode}</Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid item>
          <Button
            fullWidth
            variant="contained"
            color={
              selectedIndicator?.some((item) => item.id === indicator.id)
                ? "success"
                : "primary"
            }
            startIcon={
              selectedIndicator?.some((item) => item.id === indicator.id) ? (
                <CheckIcon />
              ) : undefined
            }
            onClick={handleSelection}
          >
            {selectedIndicator?.some((item) => item.id === indicator.id)
              ? "Selected"
              : "Select"}
          </Button>
        </Grid>
        {/*</Grid>*/}
      </Grid>
    </>
  );
};

export default IndicatorCard;
