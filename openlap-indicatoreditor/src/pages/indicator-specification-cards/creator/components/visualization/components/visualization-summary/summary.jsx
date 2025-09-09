import { Chip, Grid, Typography } from "@mui/material";
import { useContext } from "react";
import { ISCContext } from "../../../../indicator-specification-card";

export default function Summary({ filterType, chartType }) {
  const { lockedStep } = useContext(ISCContext);
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
        {!handleCheckChartType() &&
          !handleCheckChartType() &&
          !lockedStep.visualization.step && (
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
