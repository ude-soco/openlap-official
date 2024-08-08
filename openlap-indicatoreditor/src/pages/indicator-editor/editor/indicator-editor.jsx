import { Grid, Typography, Paper } from "@mui/material";
import PreviewPanel from "./components/preview-panel/preview-panel";
import SelectionPanel from "./components/selection-panel/selection-panel";

const IndicatorEditor = () => {
  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Indicator Editor</Typography>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item sx={{ maxWidth: "550px", width: "100%" }}>
              <PreviewPanel />
            </Grid>
            <Grid item xs={12} lg>
              <SelectionPanel />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default IndicatorEditor;
