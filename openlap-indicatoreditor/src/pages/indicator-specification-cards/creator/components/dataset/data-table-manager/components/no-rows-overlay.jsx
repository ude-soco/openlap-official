import { Grid, Typography } from "@mui/material";

const NoRowsOverlay = () => {
  return (
    <>
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        sx={{ height: "100%" }}
      >
        <Grid size="auto">
          <Typography align="center">
            No rows yet.
            <br />
            Use <b>Add row</b> above to start entering your data.
          </Typography>
        </Grid>
      </Grid>
    </>
  );
};

export default NoRowsOverlay;
