import { useContext } from "react";
import { Chip, Grid, Typography } from "@mui/material";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";

const PlatformChips = () => {
  const { indicatorQuery } = useContext(BasicIndicatorContext);

  return (
    <>
      {/* Platform */}
      {indicatorQuery.platforms.length !== 0 && (
        <Grid item xs={12}>
          <Grid container alignItems="center" spacing={1}>
            <Grid item>
              <Typography>Platform(s):</Typography>
            </Grid>
            <Grid item>
              <Grid container spacing={1}>
                {indicatorQuery.platforms?.map((platform, index) => (
                  <Grid item key={index}>
                    <Chip label={platform} />
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

export default PlatformChips;
