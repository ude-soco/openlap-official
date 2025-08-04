import { Chip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";

export default function Summary({ filterType, chartType }) {
  const handleCheckFilterType = () => {
    return filterType !== "";
  };
  const handleCheckChartType = () => {
    return chartType !== "";
  };
  return (
    <>
      <Grid container spacing={1}>
        {handleCheckFilterType() && (
          <Grid size={{ xs: 12 }}>
            <Grid container alignItems="center" spacing={1}>
              <Typography>Filters applied</Typography>
              <Chip label={filterType} />
            </Grid>
          </Grid>
        )}
        {handleCheckChartType() && (
          <Grid size={{ xs: 12 }}>
            <Grid container alignItems="center" spacing={1}>
              <Typography>Chart selected</Typography>
              <Chip label={chartType} />
            </Grid>
          </Grid>
        )}
        {!handleCheckChartType() && !handleCheckChartType() && (
          <Grid size={{ xs: 12 }}>
            <Typography>
              <em>No visualization selected yet!</em>
            </Typography>
          </Grid>
        )}
      </Grid>
    </>
  );
}
