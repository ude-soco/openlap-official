import { Box, Grid, Typography, Paper, TextField, Button } from "@mui/material";
import { useContext, useEffect } from "react";
import { IndicatorEditorContext } from "../../indicator-editor";
import EmptyPreview from "../../../../../assets/images/vis-empty-state/no-indicator-preview.svg";
import { CustomThemeContext } from "../../../../../setup/theme-manager/theme-context-manager";
import { fetchCreateBasicIndicator } from "./utils/preview-api";
import { AuthContext } from "../../../../../setup/auth-context-manager/auth-context-manager";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";

const PreviewPanel = () => {
  const { api } = useContext(AuthContext);
  const { darkMode } = useContext(CustomThemeContext);
  const { indicatorQuery, analysisRef, visRef, indicator, setIndicator } =
    useContext(IndicatorEditorContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const script = document.createElement("script");
    script.innerHTML = indicator.previewData.scriptData;
    document.getElementById("root").appendChild(script);
    return () => {
      document.getElementById("root").removeChild(script);
    };
  }, [indicator.previewData.scriptData]);

  const handleChangeIndicatorName = (event) => {
    const { name, value } = event.target;
    setIndicator((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleCreateBasicPreview = () => {
    const loadCreateBasicIndicator = async (
      api,
      indicatorQuery,
      analysisRef,
      visRef,
      indicator
    ) => {
      try {
        let createBasicIndicatorMessageResponse =
          await fetchCreateBasicIndicator(
            api,
            indicatorQuery,
            analysisRef,
            visRef,
            indicator
          );
        enqueueSnackbar(createBasicIndicatorMessageResponse, {
          variant: "success",
        });
        navigate("/indicator");
        clearSession();
      } catch (error) {
        console.log("Error analyzing the data");
      }
    };

    loadCreateBasicIndicator(
      api,
      indicatorQuery,
      analysisRef,
      visRef,
      indicator
    );
  };

  const clearSession = () => {
    sessionStorage.removeItem("session");
    sessionStorage.removeItem("dataset");
    sessionStorage.removeItem("filters");
    sessionStorage.removeItem("analysis");
    sessionStorage.removeItem("visualization");
  };

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
                onChange={handleChangeIndicatorName}
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
                {indicator.previewData.displayCode.length !== 0 ? (
                  indicator.previewData.displayCode
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
            onClick={handleCreateBasicPreview}
          >
            Save Indicator
          </Button>
        </Grid>
      ) : undefined}
    </Grid>
  );
};

export default PreviewPanel;
