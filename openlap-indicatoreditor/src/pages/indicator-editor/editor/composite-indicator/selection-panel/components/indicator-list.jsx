import React, { useContext, useEffect } from "react";
import {
  Chip,
  Divider,
  Grid,
  Pagination,
  Skeleton,
  Typography,
} from "@mui/material";
import IndicatorCard from "./indicator-card.jsx";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestAllMyIndicatorsWithCode } from "../utils/selection-api.js";

const IndicatorList = ({ state, setState }) => {
  const { api } = useContext(AuthContext);

  useEffect(() => {
    const loadIndicatorList = async (api, params) => {
      try {
        return requestAllMyIndicatorsWithCode(api, params);
      } catch (error) {
        console.log("Error getting indicators");
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
  }, [state.allIndicators.content.length]);

  const handleChangePagination = (event, value) => {
    console.log(value);
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

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Select an indicator</Typography>
        </Grid>
        {Object.entries(state.selectedIndicator).length === 0 ? (
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
                          state={state}
                          setState={setState}
                        />
                      </Grid>
                    ))}
              </Grid>
            </Grid>
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
          </>
        ) : (
          <Grid item xs={12}>
            <Grid container spacing={2} sx={{ minHeight: 300 }}>
              <Grid item xs={12} lg={6}>
                <IndicatorCard
                  indicator={state.selectedIndicator}
                  state={state}
                  setState={setState}
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
                <Chip label={state.selectedIndicator.name} />
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
