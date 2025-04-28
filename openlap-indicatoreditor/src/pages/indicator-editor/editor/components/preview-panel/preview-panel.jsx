import { useContext, useEffect, useRef, useState } from "react";
import { CustomThemeContext } from "../../../../../setup/theme-manager/theme-context-manager.jsx";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  IconButton,
  Grid,
  Skeleton,
  Tooltip,
  Typography,
  AccordionActions,
  Button,
  Grow,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import EmptyPreview from "../../../../../assets/images/vis-empty-state/no-indicator-preview.svg";
import ChartCustomization from "./customizations/chart-customization.jsx";
import NameDialog from "./name-dialog.jsx";

const PreviewPanel = ({
  lockedStep,
  indicator,
  loading,
  indicatorQuery,
  chartConfiguration,
  visRef,
  analysisRef,
  setVisRef,
  setIndicator,
  setLoading,
  setLockedStep,
  handleSaveIndicator,
}) => {
  const { darkMode } = useContext(CustomThemeContext);
  const scriptRef = useRef(null);
  const [state, setState] = useState({
    openSaveDialog: false,
  });

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

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      finalize: {
        ...prevState.finalize,
        openPanel: !prevState.finalize.openPanel,
      },
    }));
  };

  const handleOpenSaveDialog = () => {
    setState((prevState) => ({
      ...prevState,
      openSaveDialog: !prevState.openSaveDialog,
    }));
  };

  return (
    <>
      <Accordion
        expanded={lockedStep.finalize.openPanel}
        disabled={lockedStep.finalize.locked}
      >
        <AccordionSummary>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Grid
                container
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Grid item xs>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      {!lockedStep.finalize.locked ? (
                        <Chip label="5" color="primary" />
                      ) : (
                        <IconButton size="small">
                          <LockIcon />
                        </IconButton>
                      )}
                    </Grid>
                    <Grid item>
                      <Typography>Preview & Finalize</Typography>
                    </Grid>
                    {!lockedStep.finalize.locked &&
                      !lockedStep.finalize.openPanel && (
                        <Grid item>
                          <Tooltip title="Edit and customize visualization">
                            <IconButton onClick={handleTogglePanel}>
                              <EditIcon color="primary" />
                            </IconButton>
                          </Tooltip>
                        </Grid>
                      )}
                  </Grid>
                </Grid>
                {lockedStep.finalize.openPanel && (
                  <Grid item>
                    <Tooltip title="Close panel">
                      <IconButton onClick={handleTogglePanel}>
                        <CloseIcon color="primary" />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} alignItem="center">
            <Grid
              item
              xs={12}
              lg={
                !loading && indicator.previewData.displayCode.length === 0
                  ? chartConfiguration &&
                    visRef.visualizationLibraryId.length > 0
                    ? 7
                    : 12
                  : 7
              }
            >
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
                <Grow
                  in={loading}
                  timeout={{ enter: 500, exit: 0 }}
                  unmountOnExit
                >
                  <Box width="100%">
                    <Skeleton variant="rectangular" height={500} width="100%" />
                  </Box>
                </Grow>
                <Grow
                  in={
                    !loading && indicator.previewData.displayCode.length !== 0
                  }
                  timeout={{ enter: 500, exit: 0 }}
                  unmountOnExit
                >
                  <div>{indicator.previewData.displayCode[0]}</div>
                </Grow>
                <Grow
                  in={
                    !loading && indicator.previewData.displayCode.length === 0
                  }
                  unmountOnExit
                >
                  <Box
                    component="img"
                    src={EmptyPreview}
                    sx={{
                      p: 4,
                      maxWidth: 500,
                      maxHeight: 500,
                      filter: darkMode ? "invert(1)" : undefined,
                    }}
                  />
                </Grow>
              </Grid>
            </Grid>
            <Grow
              in={
                chartConfiguration && visRef.visualizationLibraryId.length > 0
              }
              timeout={{ enter: 500, exit: 0 }}
              unmountOnExit
            >
              <Grid item xs={12} lg={5}>
                <ChartCustomization
                  indicatorQuery={indicatorQuery}
                  analysisRef={analysisRef}
                  chartConfiguration={chartConfiguration}
                  setVisRef={setVisRef}
                  setIndicator={setIndicator}
                  setLoading={setLoading}
                />
              </Grid>
            </Grow>
          </Grid>
        </AccordionDetails>
        <AccordionActions sx={{ py: 2 }}>
          <Grid item xs={12}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12} md={6}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={indicator.previewData.displayCode.length === 0}
                  onClick={handleOpenSaveDialog}
                >
                  Save Indicator
                </Button>
              </Grid>
            </Grid>
          </Grid>
          <NameDialog
            open={state.openSaveDialog}
            toggleOpen={handleOpenSaveDialog}
            indicator={indicator}
            setIndicator={setIndicator}
            handleSaveIndicator={handleSaveIndicator}
          />
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default PreviewPanel;
