import { useContext } from "react";
import { Chip, Grid, Typography } from "@mui/material";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";
import dayjs from "dayjs";

const DateRangeChips = () => {
  const { indicatorQuery, lockedStep } = useContext(BasicIndicatorContext);

  return (
    <>
      {/* Date Range */}
      {!lockedStep.filters && (
        <Grid item xs={12}>
          <Grid container alignItems="center" spacing={1}>
            <Grid item>
              <Typography>Timeframe:</Typography>
            </Grid>
            <Grid item sm>
              <Grid container spacing={1}>
                {Object.entries(indicatorQuery.duration).map(([key, value]) => (
                  <Grid item key={key}>
                    <Chip
                      label={`${key}: ${dayjs(value).format("YYYY-MM-DD")}`}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}
    </>
  );
};

export default DateRangeChips;
