import { Grid, Typography, useMediaQuery, useTheme } from "@mui/material";
import PreviewPanel from "./components/preview-panel/preview-panel";
import SelectionPanel from "./components/selection-panel/selection-panel";

const IndicatorEditor = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Indicator Editor</Typography>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {isSmallScreen ? (
              <>
                <Grid item xs={12} lg={8}>
                  <SelectionPanel />
                </Grid>
                <Grid item xs={12} lg={4}>
                  <PreviewPanel />
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12} lg={4}>
                  <PreviewPanel />
                </Grid>
                <Grid item xs={12} lg={8}>
                  <SelectionPanel />
                </Grid>
              </>
            )}
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default IndicatorEditor;
