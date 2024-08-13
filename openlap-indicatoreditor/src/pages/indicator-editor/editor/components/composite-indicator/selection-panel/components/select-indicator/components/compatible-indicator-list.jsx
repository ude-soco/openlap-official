import React, { useContext, useEffect } from "react";
import {
  Chip,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import { requestCompatibleIndicators } from "../../../utils/selection-api.js";
import { AuthContext } from "../../../../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import CompatibleIndicatorCard from "./compatible-indicator-card.jsx";
import HelpIcon from "@mui/icons-material/Help";

const CompatibleIndicatorList = ({ state, setState }) => {
  const { api } = useContext(AuthContext);

  useEffect(() => {
    const loadCompatibleIndicators = async (api, indicatorId) => {
      try {
        return requestCompatibleIndicators(api, indicatorId);
      } catch (error) {
        console.log("Could not find compatible indicators");
      }
    };

    if (Object.entries(state.selectedIndicator).length !== 0) {
      loadCompatibleIndicators(api, state.selectedIndicator.id).then(
        (response) => {
          setState((prevState) => ({
            ...prevState,
            compatibleIndicators: {
              ...prevState.compatibleIndicators,
              indicators: response.indicators,
              analyticsTechnique: response.analyticsTechnique,
              analyticsOutputs: response.analyticsOutputs,
            },
          }));
        },
      );
    }
  }, [state.selectedIndicator]);

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          {Boolean(state.compatibleIndicators.analyticsTechnique.name) ? (
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Typography>Shared analysis technique</Typography>
              </Grid>
              <Grid item xs={12}>
                <Chip
                  label={state.compatibleIndicators.analyticsTechnique.name}
                />
              </Grid>
            </Grid>
          ) : (
            <Skeleton />
          )}
        </Grid>
        {/*<Grid item xs={12} sx={{ mb: 1 }}>*/}
        {/*  <Divider />*/}
        {/*</Grid>*/}
        <Grid item xs={12}>
          {Boolean(state.compatibleIndicators.analyticsTechnique.name) ? (
            <Grid container alignItems="center">
              <Grid item>
                <Typography>Compatible indicators</Typography>
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
            {state.compatibleIndicators.indicators.length === 0
              ? Array.from({ length: 2 }).map((_, index) => (
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
              : state.compatibleIndicators.indicators?.map((indicator) => (
                  <Grid
                    item
                    xs={12}
                    lg={6}
                    key={indicator.id}
                    sx={{ display: "flex", alignItems: "stretch" }}
                  >
                    <CompatibleIndicatorCard
                      indicator={indicator}
                      state={state}
                      setState={setState}
                    />
                  </Grid>
                ))}
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography>Selected compatible Indicator</Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                {state.selectedCompatibleIndicators.map((indicator) => (
                  <Grid item>
                    <Chip label={indicator.name} />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12} sx={{ mb: 1 }}>
          <Divider />
        </Grid>
      </Grid>
    </>
  );
};

export default CompatibleIndicatorList;
