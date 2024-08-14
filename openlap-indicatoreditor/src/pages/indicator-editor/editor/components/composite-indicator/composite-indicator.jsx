import React, { createContext, useContext, useState } from "react";
import {
  Divider,
  Grid,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useSnackbar } from "notistack";
import PreviewPanel from "../basic-indicator/preview-panel/preview-panel.jsx";
import SelectionPanel from "./selection-panel/selection-panel.jsx";

export const CompositeIndicatorContext = createContext(undefined);

const CompositeIndicator = () => {
  const { api } = useContext(AuthContext);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("xl"));
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [indicator, setIndicator] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? {
          ...JSON.parse(savedState).indicator,
          previewData: {
            displayCode: "",
            scriptData: [],
          },
        }
      : {
          previewData: {
            displayCode: "",
            scriptData: [],
          },
          indicatorName: "",
          type: "COMPOSITE",
        };
  });

  const [indicatorRef, setIndicatorRef] = useState({
    columnToMerge: {},
    indicators: [],
  });

  const [visRef, setVisRef] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? JSON.parse(savedState).visRef
      : {
          visualizationLibraryId: "",
          visualizationTypeId: "",
          visualizationParams: {
            height: 400,
            width: 400,
          },
          visualizationMapping: {
            mapping: [],
          },
        };
  });

  const [lockedStep, setLockedStep] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? JSON.parse(savedState).lockedStep
      : {
          indicators: {
            locked: false,
            openPanel: true,
          },
          visualization: {
            locked: true,
            openPanel: false,
          },
        };
  });

  const handleChangeIndicatorName = (event) => {
    const { name, value } = event.target;
    setIndicator((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSaveNewBasicIndicator = () => {
    console.log("Saved");
  };

  return (
    <>
      <CompositeIndicatorContext.Provider
        value={{
          lockedStep,
          indicator,
          setLockedStep,
          setIndicator,
          indicatorRef,
          setIndicatorRef,
          visRef,
          setVisRef,
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Grid container alignItems="center">
              <Grid item>
                <Tooltip
                  arrow
                  title={
                    <Typography variant="body2">
                      Back to Indicator Editor
                    </Typography>
                  }
                >
                  <IconButton
                    size="small"
                    onClick={() => navigate("/indicator/editor")}
                  >
                    <ArrowBack />
                  </IconButton>
                </Tooltip>
              </Grid>
              <Grid item xs>
                <Typography align="center">
                  Composite Indicator Editor
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Divider />
          </Grid>
          {isSmallScreen ? (
            <>
              <Grid item xs={12} xl={8}>
                <SelectionPanel />
              </Grid>
              <Grid item xs={12} xl={4}>
                <PreviewPanel
                  indicator={indicator}
                  changeIndicatorName={handleChangeIndicatorName}
                  handleSaveIndicator={handleSaveNewBasicIndicator}
                />
              </Grid>
            </>
          ) : (
            <>
              <Grid item xs={12} xl={4}>
                <PreviewPanel
                  indicator={indicator}
                  changeIndicatorName={handleChangeIndicatorName}
                  handleSaveIndicator={handleSaveNewBasicIndicator}
                />
              </Grid>
              <Grid item xs={12} lg={8}>
                <SelectionPanel />
              </Grid>
            </>
          )}
        </Grid>
      </CompositeIndicatorContext.Provider>
    </>
  );
};

export default CompositeIndicator;
