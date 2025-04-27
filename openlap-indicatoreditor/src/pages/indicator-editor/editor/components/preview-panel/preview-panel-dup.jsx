import {
  Box,
  Button,
  Grid,
  Paper,
  TextField,
  Typography,
  LinearProgress,
} from "@mui/material";
import { useContext, useEffect, useRef } from "react";
import EmptyPreview from "../../../../../assets/images/vis-empty-state/no-indicator-preview.svg";
import { CustomThemeContext } from "../../../../../setup/theme-manager/theme-context-manager.jsx";

const PreviewPanel = ({
  indicator,
  changeIndicatorName,
  handleSaveIndicator,
  loading,
}) => {
  const { darkMode } = useContext(CustomThemeContext);
  const scriptRef = useRef(null);

  useEffect(() => {
    if (!scriptRef.current) {
      const script = document.createElement("script");
      script.innerHTML = indicator.previewData.scriptData;
      document.getElementById("root").appendChild(script);
      scriptRef.current = script;
    } else {
      scriptRef.current.innerHTML = indicator.previewData.scriptData;
    }

    return () => {
      if (scriptRef.current) {
        document.getElementById("root").removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, [indicator.previewData.scriptData]);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper
          sx={{ p: 2, border: "1px solid #e0e0e0", minHeight: 600 }}
          elevation={0}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sx={{ pb: 2 }}>
              <TextField
                autoFocus
                name="indicatorName"
                value={indicator.indicatorName}
                label="Indicator name"
                placeholder="E.g., Student's performance chart"
                variant="standard"
                fullWidth
                onChange={changeIndicatorName}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography>Preview</Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid
                container
                justifyContent="center"
                id="preview"
                sx={{
                  backgroundColor:
                    indicator.previewData.displayCode.length !== 0
                      ? "white"
                      : undefined,
                  borderRadius: 1.5,
                  p: 2,
                }}
              >
                {loading ? (
                  <Box width="100%">
                    <LinearProgress />
                    <Typography variant="body1" mt={2} align="center">
                      Loading...
                    </Typography>
                  </Box>
                ) : !loading &&
                  indicator.previewData.displayCode.length !== 0 ? (
                  indicator.previewData.displayCode[0]
                ) : (
                  <Box
                    component="img"
                    src={EmptyPreview}
                    sx={{
                      p: 4,
                      maxWidth: 300,
                      maxHeight: 300,
                      filter: darkMode ? "invert(1)" : undefined,
                    }}
                  />
                )}
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      {indicator.previewData.displayCode.length !== 0 ? (
        <Grid item xs={12}>
          <Button
            disabled={indicator.indicatorName.length === 0}
            variant="contained"
            fullWidth
            onClick={handleSaveIndicator}
          >
            Save Indicator
          </Button>
        </Grid>
      ) : undefined}
    </Grid>
  );
};

export default PreviewPanel;
