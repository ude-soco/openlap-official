import { useContext, useEffect, useState } from "react";
import { requestISCDetails } from "../utils/dashboard-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  Chip,
  Breadcrumbs,
  Divider,
  Grid,
  Link,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import PreviewChart from "./preview-chart.jsx";

const IscPreview = () => {
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

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Breadcrumbs>
            <Link
              component={RouterLink}
              underline="hover"
              color="inherit"
              to="/"
            >
              Home
            </Link>
            <Link
              component={RouterLink}
              underline="hover"
              color="inherit"
              to="/isc"
            >
              ISC Dashboard
            </Link>
            <Typography sx={{ color: "text.primary" }}>
              Preview Indicator
            </Typography>
          </Breadcrumbs>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Grid container justifyContent="center" spacing={2}>
            {/*<Grid item xs={12} lg={7}>*/}
            {/*  <Grid container justifyContent="flex-end" spacing={1}>*/}
            {/*    <Button*/}
            {/*      disabled*/}
            {/*      variant="contained"*/}
            {/*      color="primary"*/}
            {/*      startIcon={<Edit />}*/}
            {/*    >*/}
            {/*      Edit*/}
            {/*    </Button>*/}
            {/*  </Grid>*/}
            {/*</Grid>*/}
            <Grid item xs={12} lg={7}>
              {state.loading ? (
                <Skeleton variant="rounded" height={500} />
              ) : (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="h5" gutterBottom>
                        {requirements.indicatorName}
                      </Typography>
                      <Typography gutterBottom variant="body2">
                        Created on: {state.createdOn.split("T")[0]}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="overline">
                        I want to (goal)
                      </Typography>
                      <Grid item xs={12}>
                        <Chip label={requirements.goalType?.category} />
                      </Grid>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <Typography variant="overline">
                        I am interested in (question)
                      </Typography>
                      <Grid item xs={12}>
                        <Chip label={requirements.question} />
                      </Grid>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="overline">
                        I need an indicator showing
                      </Typography>
                      <Grid item xs={12}>
                        <Chip label={requirements.indicatorName} />
                      </Grid>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="overline">
                        I need the following data
                      </Typography>
                      <Grid container spacing={1}>
                        {dataset.columns?.map((column, index) => (
                          <Grid item key={index}>
                            <Chip label={column.headerName} />
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="overline">
                        I need the following chart (Idiom)
                      </Typography>
                      <Grid item xs={12}>
                        <Chip label={visRef.chart?.type} />
                      </Grid>
                    </Grid>

                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={12}>
                      {Object.values(visRef).length > 0 && (
                        <PreviewChart dataset={dataset} visRef={visRef} />
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              )}
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default IscPreview;
