import { useContext } from "react";
import { Grid, Typography, Chip, Tooltip } from "@mui/material";
import { getLastWordAndCapitalize } from "../../../utils/utils.js";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";

const ActivityTypeChips = () => {
  const { indicatorQuery } = useContext(BasicIndicatorContext);
  const maxDisplayed = 3;
  const moreCount =
    indicatorQuery.activityTypes.length > maxDisplayed
      ? indicatorQuery.activityTypes.length - maxDisplayed
      : 0;
  const displayedActivityTypes = indicatorQuery.activityTypes.slice(
    0,
    maxDisplayed
  );

  return (
    <>
      {indicatorQuery.activityTypes.length !== 0 && (
        <Grid item xs={12}>
          <Grid container alignItems="center" spacing={1}>
            <Grid item>
              <Typography>Activity types:</Typography>
            </Grid>
            <Grid item>
              <Grid container spacing={1} alignItems="center">
                {displayedActivityTypes.map((activityType, index) => (
                  <Grid item key={index}>
                    <Tooltip
                      arrow
                      title={
                        <Typography align="center">{activityType}</Typography>
                      }
                    >
                      <Chip label={getLastWordAndCapitalize(activityType)} />
                    </Tooltip>
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

export default ActivityTypeChips;
