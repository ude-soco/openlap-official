import { useContext } from "react";
import { Chip, Grid, Typography } from "@mui/material";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";

const ActivityChips = () => {
  const { indicatorQuery } = useContext(BasicIndicatorContext);
  const activities = Object.values(indicatorQuery.activities).flat();
  const maxDisplayed = 3;
  const moreCount =
    activities.length > maxDisplayed ? activities.length - maxDisplayed : 0;
  const displayedActivities = activities.slice(0, maxDisplayed);

  return (
    <>
      {activities.length !== 0 && (
        <Grid item xs={12}>
          <Grid container alignItems="center" spacing={1}>
            <Grid item>
              <Typography>Activities:</Typography>
            </Grid>
            <Grid item md>
              <Grid container spacing={1} alignItems="center">
                {displayedActivities.map((activity, index) => (
                  <Grid item key={index}>
                    <Chip label={activity} />
                  </Grid>
                ))}
                {moreCount > 0 && (
                  <Grid item>
                    <Typography
                      variant="body2"
                      sx={{ fontStyle: "italic" }}
                    >{`${moreCount} more...`}</Typography>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}
    </>
  );
};

export default ActivityChips;
