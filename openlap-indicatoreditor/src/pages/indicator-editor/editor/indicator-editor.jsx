import { Grid, Typography, useMediaQuery, useTheme } from "@mui/material";
import PreviewPanel from "./components/preview-panel/preview-panel";
import SelectionPanel from "./components/selection-panel/selection-panel";
import { useState, createContext } from "react";

export const IndicatoEditorContext = createContext();

const IndicatorEditor = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));

  const [indicator, setIndicator] = useState({
    previewData: {
      displayCode: "",
      scriptData: [],
    },
    indicatorName: {},
    type: "BASIC",
  });

  return (
    <IndicatoEditorContext.Provider value={{ indicator, setIndicator }}>
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
    </IndicatoEditorContext.Provider>
  );
};

export default IndicatorEditor;
