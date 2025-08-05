import React, { useContext, useEffect } from "react";
import {
  Chip,
  Divider,
  Grid,
  Pagination,
  Skeleton,
  Typography,
} from "@mui/material";
import IndicatorCard from "../../../components/indicator-card/indicator-card.jsx";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestAllMyIndicatorsWithCode } from "../utils/selection-api.js";
import { CompositeIndicatorContext } from "../../composite-indicator.jsx";
import { useSnackbar } from "notistack";

const IndicatorList = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { setIndicatorRef } = useContext(CompositeIndicatorContext);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const loadIndicatorList = async (api, params) => {
      try {
        return await requestAllMyIndicatorsWithCode(api, params);
      } catch (error) {
        enqueueSnackbar("Error getting indicators", { variant: "error" });
        console.log(error);
      }
    };

    if (state.allIndicators.content.length === 0) {
      loadIndicatorList(api, state.params).then((response) => {
        setState((prevState) => ({
          ...prevState,
          allIndicators: response,
        }));
      });
    }
  }, [state.allIndicators.content]);

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

  const handleSelectIndicator = (indicator) => {
    if (!Boolean(state.selectedIndicator.length)) {
      setState((prevState) => ({
        ...prevState,
        selectedIndicator: [indicator],
      }));
      setIndicatorRef((prevState) => ({
        ...prevState,
        indicators: [{ indicatorId: indicator.id }],
      }));
    } else {
      setState((prevState) => ({
        ...prevState,
        selectedIndicator: [],
        compatibleIndicators: {
          content: [
            {
              indicators: [],
              analyticsTechnique: {},
              analyticsOutputs: [],
            },
          ],
        },
        selectedCompatibleIndicators: [],
      }));
      setIndicatorRef((prevState) => ({
        ...prevState,
        indicators: [],
      }));
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Select an indicator</Typography>
        </Grid>
        {state.selectedIndicator.length === 0 ? (
          <>
            <Grid item xs={12}>
              <Grid container spacing={2} sx={{ minHeight: 300 }}>
                {state.allIndicators.content.length === 0
                  ? Array.from({ length: 2 }).map((_, index) => (
                      <Grid
                        item
                        xs={12}
                        lg={6}
                        key={index}
                        sx={{ display: "flex", alignItems: "stretch" }}
                      >
                        <Skeleton
                          variant="rectangular"
                          height={300}
                          width="100%"
                        />
                      </Grid>
                    ))
                  : state.allIndicators.content?.map((indicator) => (
                      <Grid
                        item
                        xs={12}
                        lg={6}
                        key={indicator.id}
                        sx={{ display: "flex", alignItems: "stretch" }}
                      >
                        <IndicatorCard
                          indicator={indicator}
                          selectedIndicator={state.selectedIndicator}
                          handleSelection={() =>
                            handleSelectIndicator(indicator)
                          }
                        />
                      </Grid>
                    ))}
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Grid container justifyContent="center">
                <Pagination
                  count={state.allIndicators.totalPages}
                  color="primary"
                  onChange={handleChangePagination}
                />
              </Grid>
            </Grid>
          </>
        ) : (
          <Grid item xs={12}>
            <Grid container spacing={2} sx={{ minHeight: 300 }}>
              <Grid item xs={12} lg={6}>
                <IndicatorCard
                  indicator={state.selectedIndicator[0]}
                  selectedIndicator={state.selectedIndicator}
                  handleSelection={() =>
                    handleSelectIndicator(state.selectedIndicator[0])
                  }
                />
              </Grid>
            </Grid>
          </Grid>
        )}

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography>Selected Indicator</Typography>
            </Grid>
            <Grid item xs={12}>
              {Object.entries(state.selectedIndicator).length ? (
                <Chip label={state.selectedIndicator[0].name} />
              ) : undefined}
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
