import { useContext } from "react";
import { Chip, Grid, Typography } from "@mui/material";
import { getLastWordAndCapitalize } from "../../../utils/utils.js";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";

const ActionsChips = () => {
  const { indicatorQuery } = useContext(BasicIndicatorContext);
  const actions = indicatorQuery.actionOnActivities;
  const maxDisplayed = 3;
  const moreCount =
    actions.length > maxDisplayed ? actions.length - maxDisplayed : 0;
  const displayedActions = actions.slice(0, maxDisplayed);

  return (
    <>
      {actions.length !== 0 && (
        <Grid item xs={12}>
          <Grid container alignItems="center" spacing={1}>
            <Grid item>
              <Typography>Actions:</Typography>
            </Grid>
            <Grid item>
              <Grid container spacing={1} alignItems="center">
                {displayedActions.map((action, index) => (
                  <Grid item key={index}>
                    <Chip label={getLastWordAndCapitalize(action)} />
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

export default ActionsChips;
