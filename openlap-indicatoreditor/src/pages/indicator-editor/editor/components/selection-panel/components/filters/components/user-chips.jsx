import { useContext } from "react";
import { SelectionContext } from "../../../selection-panel";
import { Chip, Grid, Typography } from "@mui/material";
import Condition from "../../../utils/condition";

const UserChips = () => {
  const { indicatorQuery, lockedStep } = useContext(SelectionContext);

  return (
    <>
      {!lockedStep.filters && (
        <Grid item xs={12}>
          <Grid container alignItems="center" spacing={1}>
            <Grid item>
              <Typography>Users:</Typography>
            </Grid>
            <Grid item xs>
              <Grid container spacing={1}>
                <Grid item>
                  <Chip
                    label={
                      indicatorQuery.userQueryCondition === Condition.only_me
                        ? "Use only my data"
                        : Condition.exclude_me
                        ? "Exclude my data"
                        : "Include all data"
                    }
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}
    </>
  );
};

export default UserChips;
