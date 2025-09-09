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
            No data available.
            <br />
            <b>Create a new column</b> to add data to the table.
          </Typography>
        </Grid>
      </Grid>
    </>
  );
};

export default NoRowsOverlay;
