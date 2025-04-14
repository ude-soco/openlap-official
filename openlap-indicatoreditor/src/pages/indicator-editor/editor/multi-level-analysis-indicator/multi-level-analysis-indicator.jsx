import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useSnackbar } from "notistack";
import SelectionPanel from "./selection-panel/selection-panel.jsx";
import PreviewPanel from "../components/preview-panel/preview-panel.jsx";
import { requestCreateMultiLevelIndicatorIndicator } from "../components/preview-panel/utils/preview-api.js";

export const MultiLevelAnalysisIndicatorContext = createContext(undefined);

const MultiLevelAnalysisIndicator = () => {
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
          type: "MULTI_LEVEL",
        };
  });

  const [indicatorRef, setIndicatorRef] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? JSON.parse(savedState).indicatorRef
      : {
          indicators: [],
          mergedData: {},
        };
  });

  const [analysisRef, setAnalysisRef] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? JSON.parse(savedState).analysisRef
      : {
          analyticsTechniqueId: "",
          analyticsTechniqueParams: [],
          analyticsTechniqueMapping: {
            mapping: [],
          },
          analyzedData: {},
        };
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

  const [analysisInputMenu, setAnalysisInputMenu] = useState();

  const [lockedStep, setLockedStep] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? JSON.parse(savedState).lockedStep
      : {
          indicators: {
            locked: false,
            openPanel: true,
          },
          columnMerge: {
            locked: true,
            openPanel: false,
          },
          analysis: {
            locked: true,
            openPanel: false,
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
    const loadCreateMultiLevelIndicator = async (
      api,
      indicator,
      indicatorRef,
      analysisRef,
      visRef
    ) => {
      try {
        return await requestCreateMultiLevelIndicatorIndicator(
          api,
          indicator,
          indicatorRef,
          analysisRef,
          visRef
        );
      } catch (error) {
        console.log("Error analyzing the data");
      }
    };

    loadCreateMultiLevelIndicator(
      api,
      indicator,
      indicatorRef,
      analysisRef,
      visRef
    ).then((response) => {
      enqueueSnackbar(response.message, {
        variant: "success",
      });
      navigate("/indicator");
      clearSession();
    });
  };

  const clearSession = () => {
    sessionStorage.removeItem("session");
    sessionStorage.removeItem("dataset");
    sessionStorage.removeItem("filters");
    sessionStorage.removeItem("analysis");
    sessionStorage.removeItem("visualization");
  };

  return (
    <MultiLevelAnalysisIndicatorContext.Provider
      value={{
        lockedStep,
        indicatorRef,
        analysisRef,
        analysisInputMenu,
        visRef,
        indicator,
        setLockedStep,
        setIndicatorRef,
        setAnalysisRef,
        setAnalysisInputMenu,
        setVisRef,
        setIndicator,
      }}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container alignItems="center">
            <Grid item>
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
                <Grid item>
                  <Typography>Back</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs>
              <Typography align="center">
                Multi-level Analysis Indicator Editor
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
    </MultiLevelAnalysisIndicatorContext.Provider>
  );
};

export default MultiLevelAnalysisIndicator;
