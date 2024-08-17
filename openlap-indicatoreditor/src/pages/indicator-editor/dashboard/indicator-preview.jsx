import {
  Box,
  Divider,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { requestIndicatorFullDetail } from "./utils/indicator-dashboard";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { handleDisplayType } from "./utils/utils";

const IndicatorPreview = () => {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const params = useParams();
  const [state, setState] = useState({
    loading: false,
    id: "",
    name: "",
    type: "",
    createdBy: "",
    createdOn: "",
    visualizationLibrary: "",
    visualizationType: "",
    visualizationParams: {},
    visualizationMapping: {
      mapping: [],
    },
    analyticsTechnique: "",
    analyticsTechniqueMapping: {
      mapping: [],
    },
    analyticsTechniqueParams: [],
    statementResponse: {
      platforms: [],
      activityTypes: [],
      actionOnActivities: [],
      activities: [],
      durationFrom: "",
      durationUntil: "",
    },
    indicatorCode: {
      displayCode: "",
      scriptData: [],
    },
  });

  useEffect(() => {
    const loadIndicatorDetail = async (api, indicatorId) => {
      setState((prevState) => ({
        ...prevState,
        loading: true,
      }));
      try {
        const indicatorDetail = await requestIndicatorFullDetail(
          api,
          indicatorId,
        );
        setState((prevState) => ({
          ...prevState,
          ...indicatorDetail,
          loading: false,
        }));
      } catch (error) {
        console.log("Error requesting my indicators");
      }
    };

    loadIndicatorDetail(api, params.id);
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.innerHTML = state.indicatorCode.scriptData;
    document.getElementById("root").appendChild(script);
    return () => {
      document.getElementById("root").removeChild(script);
    };
  }, [state.indicatorCode.scriptData]);

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Grid container alignItems="center">
          <Grid item>
            <IconButton size="small" onClick={handleGoBack}>
              <ArrowBack />
            </IconButton>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography>Back</Typography>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Divider />
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={5}>
            {state.loading ? (
              <Skeleton variant="rounded" height={500} />
            ) : (
              <Grid
                container
                component={Paper}
                variant="outlined"
                justifyContent="center"
                sx={{ backgroundColor: "white", p: 2, borderRadius: 2 }}
              >
                <Box>{state.indicatorCode.displayCode}</Box>
              </Grid>
            )}
          </Grid>
          <Grid item xs={12} lg={7}>
            <Grid container spacing={2}>
              <Grid item xs>
                <Typography variant="h5" gutterBottom>
                  {state.loading ? <Skeleton /> : `${state.name}`}
                </Typography>
                <Typography>
                  {state.loading ? (
                    <Skeleton />
                  ) : (
                    `${handleDisplayType(state.type)}`
                  )}
                </Typography>
                <Typography>
                  {state.loading ? (
                    <Skeleton />
                  ) : (
                    `Created by: ${state.createdBy}`
                  )}
                </Typography>
                <Typography>
                  {state.loading ? (
                    <Skeleton />
                  ) : (
                    `Analysis: ${state.analyticsTechnique}`
                  )}
                </Typography>
                <Typography>
                  {state.loading ? (
                    <Skeleton />
                  ) : (
                    `Chart: ${state.visualizationType}`
                  )}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default IndicatorPreview;
