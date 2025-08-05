import { Paper, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import DatasetSummary from "./dataset-summary";

export default function Dataset() {
  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <DatasetSummary />
          </Grid>
        </Grid>
      </Paper>
    </>
  );
}
