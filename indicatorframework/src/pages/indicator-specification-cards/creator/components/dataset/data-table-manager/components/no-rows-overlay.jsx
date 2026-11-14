import { Grid, Typography } from "@mui/material";

const NoRowsOverlay = () => {
  return (
    <>
      <Grid
        container
        sx={{ justifyContent: "center", alignItems: "center", height: "100%" }}
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
