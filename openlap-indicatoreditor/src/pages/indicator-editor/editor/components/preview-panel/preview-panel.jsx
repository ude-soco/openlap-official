import { Box, Grid, Typography, Paper, TextField, Button } from "@mui/material";
import { useContext, useEffect } from "react";
import { IndicatoEditorContext } from "../../indicator-editor";
import EmptyPreview from "../../../../../assets/images/vis-empty-state/no-indicator-preview.svg";
import { CustomThemeContext } from "../../../../../setup/theme-manager/theme-context-manager";

const PreviewPanel = () => {
  const { darkMode } = useContext(CustomThemeContext);
  const { indicator } = useContext(IndicatoEditorContext);

  useEffect(() => {
    const script = document.createElement("script");
    script.innerHTML = indicator.previewData.scriptData;
    document.getElementById("root").appendChild(script);
    return () => {
      document.getElementById("root").removeChild(script);
    };
  }, [indicator.previewData.scriptData]);

  return (
    <>
      <Paper
        sx={{ p: 2, border: "1px solid #e0e0e0", minHeight: 600 }}
        elevation={0}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sx={{ pb: 2 }}>
            <TextField
              autoFocus
              label="Indicator name"
              placeholder="E.g., Student's performance chart"
              variant="standard"
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <Typography>Preview panel</Typography>
          </Grid>
          <Grid item xs={12}>
            <Grid
              container
              justifyContent="center"
              sx={{
                backgroundColor:
                  indicator.previewData.displayCode.length !== 0
                    ? "white"
                    : undefined,
                borderRadius: 1.5,
                p: 2,
              }}
            >
              {indicator.previewData.displayCode.length !== 0 ? (
                indicator.previewData.displayCode
              ) : (
                <Grid item>
                  <Box
                    component="img"
                    src={EmptyPreview}
                    sx={{
                      p: 4,
                      width: "100%",
                      height: "100%",
                      filter: darkMode ? "invert(1)" : undefined,
                    }}
                  />
                </Grid>
              )}
            </Grid>
          </Grid>
          {indicator.previewData.displayCode.length !== 0 ? (
            <Grid item xs={12}>
              <Button variant="contained" fullWidth>
                Save Indicator
              </Button>
            </Grid>
          ) : undefined}
        </Grid>
      </Paper>
    </>
  );
};

export default PreviewPanel;
