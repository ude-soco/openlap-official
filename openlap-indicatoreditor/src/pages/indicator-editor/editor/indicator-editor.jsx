import { Grid, Typography, Divider } from "@mui/material";
import BasicIndicator from "./components/basic-indicator.jsx";

const IndicatorEditor = () => {
  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Indicator Editor</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
        <Grid item xs={12}>
          <BasicIndicator />
        </Grid>
      </Grid>
    </>
  );
};

export default IndicatorEditor;
