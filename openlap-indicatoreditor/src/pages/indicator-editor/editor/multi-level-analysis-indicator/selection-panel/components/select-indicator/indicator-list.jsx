import React, { useContext, useEffect } from "react";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestAllMyIndicatorsWithCode } from "../../../../composite-indicator/selection-panel/utils/selection-api.js";
import {
  Chip,
  Divider,
  Grid,
  Pagination,
  Skeleton,
  Typography,
} from "@mui/material";
import IndicatorCard from "../../../../components/indicator-card/indicator-card.jsx";
import { MultiLevelAnalysisIndicatorContext } from "../../../multi-level-analysis-indicator.jsx";
import { useSnackbar } from "notistack";

const IndicatorList = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { setIndicatorRef } = useContext(MultiLevelAnalysisIndicatorContext);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const loadIndicatorList = async (api, params) => {
      try {
        return requestAllMyIndicatorsWithCode(api, params);
      } catch (error) {
        throw error;
      }
    };
    if (state.allIndicators.content.length === 0) {
      setState((prevState) => ({
        ...prevState,
        loadingIndicators: true,
      }));
      loadIndicatorList(api, state.params)
        .then((response) => {
          setState((prevState) => ({
            ...prevState,
            allIndicators: response,
            loadingIndicators: false,
          }));
        })
        .catch((error) => {
          enqueueSnackbar(error.response.message, { variant: "error" });
          setState((prevState) => ({
            ...prevState,
            loadingIndicators: false,
          }));
        });
    }
  }, [state.allIndicators.content.length]);

  const handleChangePagination = (event, value) => {
    setState((prevState) => ({
      ...prevState,
      params: {
        ...prevState.params,
        page: value - 1,
      },
      allIndicators: {
        ...prevState.allIndicators,
        content: [],
      },
    }));
  };

  const handleToggleSelectIndicator = (indicator) => {
    const foundSelected = state.selectedIndicators.find(
      (item) => item.id === indicator.id,
    );
    if (!Boolean(foundSelected)) {
      setState((prevState) => ({
        ...prevState,
        selectedIndicators: [...prevState.selectedIndicators, indicator],
      }));
      setIndicatorRef((prevState) => ({
        ...prevState,
        indicators: [...prevState.indicators, { indicatorId: indicator.id }],
      }));
    } else {
      setState((prevState) => ({
        ...prevState,
        selectedIndicators: prevState.selectedIndicators.filter(
          (item) => item.id !== indicator.id,
        ),
      }));
      setIndicatorRef((prevState) => ({
        ...prevState,
        indicators: prevState.indicators.filter(
          (item) => item.indicatorId !== indicator.id,
        ),
        mergedData: {},
      }));
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        {state.loadingIndicators ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Grid
              item
              xs={12}
              lg={6}
              key={index}
              sx={{ display: "flex", alignItems: "stretch" }}
            >
              <Skeleton variant="rectangular" height={300} width="100%" />
            </Grid>
          ))
        ) : state.allIndicators.content.length !== 0 ? (
          state.allIndicators.content.map((indicator) => (
            <Grid
              item
              xs={12}
              lg={6}
              key={indicator.id}
              sx={{ display: "flex", alignItems: "stretch" }}
            >
              <IndicatorCard
                indicator={indicator}
                selectedIndicator={state.selectedIndicators}
                handleSelection={() => handleToggleSelectIndicator(indicator)}
              />
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Typography>
              No indicators found. You need to create at least two basic
              indicators first.
            </Typography>
          </Grid>
        )}
        <Grid item xs={12}>
          <Grid container justifyContent="center">
            <Pagination
              count={
                Boolean(state.allIndicators.totalPages)
                  ? state.allIndicators.totalPages
                  : 1
              }
              color="primary"
              onChange={handleChangePagination}
            />
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography>Selected Indicators</Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                {state.selectedIndicators.map((indicator, index) => (
                  <Grid item key={index}>
                    <Chip
                      label={indicator.name}
                      onDelete={() => handleToggleSelectIndicator(indicator)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={12} sx={{ mb: 1 }}>
              <Divider />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default IndicatorList;
