import React, { useContext, useEffect } from "react";
import {
  Chip,
  Divider,
  Grid,
  IconButton,
  Pagination,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import { requestCompatibleIndicators } from "../utils/selection-api.js";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import HelpIcon from "@mui/icons-material/Help";
import { CompositeIndicatorContext } from "../../composite-indicator.jsx";
import IndicatorCard from "../../../components/indicator-card/indicator-card.jsx";

const CompatibleIndicatorList = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { setIndicatorRef } = useContext(CompositeIndicatorContext);

  useEffect(() => {
    const loadCompatibleIndicators = async (api, indicatorId, params) => {
      try {
        return requestCompatibleIndicators(api, indicatorId, params);
      } catch (error) {
        setState((prevState) => ({
          ...prevState,
          loadingCompatibleIndicator: false,
        }));
      }
    };

    if (state.selectedIndicator.length !== 0) {
      setState((prevState) => ({
        ...prevState,
        loadingCompatibleIndicator: true,
      }));
      loadCompatibleIndicators(
        api,
        state.selectedIndicator[0].id,
        state.compatibleIndicatorParams,
      ).then((response) => {
        setState((prevState) => ({
          ...prevState,
          loadingCompatibleIndicator: false,
          compatibleIndicators: {
            ...response,
          },
          selectedAnalyticsOutput:
            response.content[0].analyticsOutputs.length === 1
              ? response.content[0].analyticsOutputs[0]
              : {},
        }));

        setIndicatorRef((prevState) => ({
          ...prevState,
          columnToMerge:
            response.content[0].analyticsOutputs.length === 1
              ? response.content[0].analyticsOutputs[0]
              : {},
        }));
      });
    }
  }, [state.selectedIndicator]);

  const handleChangePagination = (event, value) => {
    setState((prevState) => ({
      ...prevState,
      compatibleIndicatorParams: {
        ...prevState.compatibleIndicatorParams,
        page: value - 1,
      },
      compatibleIndicators: {
        ...prevState.compatibleIndicators,
        content: [],
      },
    }));
  };

  const handleToggleSelectIndicator = (indicator) => {
    const foundSelected = state.selectedCompatibleIndicators.find(
      (item) => item.id === indicator.id,
    );

    if (!Boolean(foundSelected)) {
      setState((prevState) => ({
        ...prevState,
        selectedCompatibleIndicators: [
          ...prevState.selectedCompatibleIndicators,
          indicator,
        ],
      }));

      setIndicatorRef((prevState) => ({
        ...prevState,
        indicators: [...prevState.indicators, { indicatorId: indicator.id }],
        analyzedData: {},
      }));
    } else {
      setState((prevState) => ({
        ...prevState,
        selectedCompatibleIndicators:
          prevState.selectedCompatibleIndicators.filter(
            (item) => item.id !== indicator.id,
          ),
      }));
      setIndicatorRef((prevState) => ({
        ...prevState,
        indicators: prevState.indicators.filter(
          (item) => item.indicatorId !== indicator.id,
        ),
        analyzedData: {},
      }));
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          {Boolean(
            state.compatibleIndicators.content[0].analyticsTechnique.name,
          ) ? (
            <Grid container alignItems="center">
              <Grid item>
                <Typography>Combine compatible indicators</Typography>
              </Grid>
              <Grid item>
                <Tooltip
                  title={
                    <Grid container>
                      <Typography gutterBottom>
                        Why these indicators?
                      </Typography>
                      <Typography>
                        All of the indicators below share the same analysis
                        method
                      </Typography>
                    </Grid>
                  }
                >
                  <IconButton color="primary">
                    <HelpIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          ) : (
            <Skeleton />
          )}
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2} sx={{ minHeight: 300 }}>
            {state.loadingCompatibleIndicator ? (
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
            ) : state.compatibleIndicators.content[0].indicators.length !==
              0 ? (
              state.compatibleIndicators.content[0].indicators?.map(
                (indicator) => (
                  <Grid
                    item
                    xs={12}
                    lg={6}
                    key={indicator.id}
                    sx={{ display: "flex", alignItems: "stretch" }}
                  >
                    <IndicatorCard
                      indicator={indicator}
                      selectedIndicator={state.selectedCompatibleIndicators}
                      handleSelection={() =>
                        handleToggleSelectIndicator(indicator)
                      }
                    />
                  </Grid>
                ),
              )
            ) : (
              <Grid item xs={12}>
                <Typography>
                  No compatible indicators found. Choose another indicator.
                </Typography>
              </Grid>
            )}
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid container justifyContent="center">
            <Pagination
              count={
                Boolean(state.compatibleIndicators.totalPages)
                  ? state.compatibleIndicators.totalPages
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
              <Typography>Selected compatible Indicator</Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                {state.selectedCompatibleIndicators.map((indicator, index) => (
                  <Grid item key={index}>
                    <Chip label={indicator.name} />
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

export default CompatibleIndicatorList;
