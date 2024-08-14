import { useContext } from "react";
import { Chip, Grid, Typography } from "@mui/material";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";

const LRSChips = () => {
  const { indicatorQuery } = useContext(BasicIndicatorContext);

  return (
    <>
      {/* LRS */}
      {indicatorQuery.lrsStores.length !== 0 && (
        <Grid item xs={12}>
          <Grid container alignItems="center" spacing={1}>
            <Grid item>
              <Typography>LRS(s):</Typography>
            </Grid>
            <Grid item>
              <Grid container spacing={1}>
                {indicatorQuery.lrsStores?.map((lrs) => (
                  <Grid item key={lrs.id}>
                    <Chip label={lrs.lrsTitle} />
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

export default LRSChips;
