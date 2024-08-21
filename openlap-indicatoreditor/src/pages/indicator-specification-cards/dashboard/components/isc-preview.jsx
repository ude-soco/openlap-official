import React, { useContext, useEffect, useState } from "react";
import { requestISCDetails } from "../utils/dashboard-api.js";
import { CustomThemeContext } from "../../../../setup/theme-manager/theme-context-manager.jsx";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  Chip,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Typography,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import VisSelection from "../../creator/components/visualization/components/vis-selection.jsx";

const IscPreview = () => {
  const { darkMode } = useContext(CustomThemeContext);
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const params = useParams();
  const [requirements, setRequirements] = useState({});
  const [dataset, setDataset] = useState({});
  const [visRef, setVisRef] = useState({});
  const [state, setState] = useState({
    createdBy: "",
    createdOn: "",
    loading: false,
  });

  useEffect(() => {
    const loadISCDetail = async (api, iscId) => {
      try {
        return await requestISCDetails(api, iscId);
      } catch (error) {
        console.log("Error requesting my indicators");
      }
    };
    setState((prevState) => ({
      ...prevState,
      loading: true,
    }));
    loadISCDetail(api, params.id).then((response) => {
      setRequirements(JSON.parse(response.requirements));
      setDataset(JSON.parse(response.dataset));
      setVisRef(JSON.parse(response.visRef));
      setState((prevState) => ({
        ...prevState,
        createdBy: response.createdBy,
        createdOn: response.createdOn,
        loading: false,
      }));
    });
  }, []);

  console.log(visRef);

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <>
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
        <Grid item xs={6}>
          {state.loading ? (
            <Skeleton variant="rounded" height={500} />
          ) : (
            Object.values(visRef).length > 0 && (
              <VisSelection
                dataset={dataset}
                visRef={visRef}
                setVisRef={setVisRef}
                preview={true}
              />
            )
          )}
        </Grid>
        <Grid item xs={6}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>
                {state.loading ? <Skeleton /> : `${requirements.indicatorName}`}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              {state.loading ? (
                <Skeleton />
              ) : (
                <Grid container spacing={1} alignItems="center">
                  <Grid item>
                    <Typography>Goal:</Typography>
                  </Grid>
                  <Grid item>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item>
                        <Chip label={requirements.goalType?.verb} />
                      </Grid>
                      <Grid item>
                        <Chip label={requirements.goal} />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              )}
            </Grid>
            <Grid item xs={12}>
              {state.loading ? (
                <Skeleton />
              ) : (
                <Grid container spacing={1} alignItems="center">
                  <Grid item>
                    <Typography>Question:</Typography>
                  </Grid>
                  <Grid item>
                    <Chip label={requirements.question} />
                  </Grid>
                </Grid>
              )}
            </Grid>
            <Grid item xs={12}>
              {state.loading ? (
                <Skeleton />
              ) : (
                <Grid container spacing={1} alignItems="center">
                  <Grid item>
                    <Typography>Indicator name:</Typography>
                  </Grid>
                  <Grid item>
                    <Chip label={requirements.indicatorName} />
                  </Grid>
                </Grid>
              )}
            </Grid>
            <Grid item xs={12}>
              {state.loading ? (
                <Skeleton />
              ) : (
                <Grid container spacing={1} alignItems="center">
                  <Grid item>
                    <Typography>Data:</Typography>
                  </Grid>
                  {dataset.columns?.map((column, index) => (
                    <Grid item key={index}>
                      <Chip label={column.headerName} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>

            <Grid item xs={12}>
              {state.loading ? (
                <Skeleton />
              ) : (
                <Grid container spacing={1} alignItems="center">
                  <Grid item>
                    <Typography>Idiom:</Typography>
                  </Grid>
                  <Grid item>
                    <Chip label={visRef.chart?.type} />
                  </Grid>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>
      </Grid>
    </>
  );
};

export default IscPreview;
