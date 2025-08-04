import { useContext, useEffect, useState } from "react";
import { requestDeleteISC, requestISCDetails } from "../utils/dashboard-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  Chip,
  Breadcrumbs,
  Divider,
  Link,
  Paper,
  Skeleton,
  Typography,
  IconButton,
  Tooltip,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Link as RouterLink } from "react-router-dom";
import PreviewChart from "./preview-chart.jsx";
import DeleteDialog from "../../../../common/components/delete-dialog/delete-dialog.jsx";
import { useSnackbar } from "notistack";

const IscPreview = () => {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const params = useParams();
  const [requirements, setRequirements] = useState({});
  const [dataset, setDataset] = useState({});
  const [visRef, setVisRef] = useState({});
  const [state, setState] = useState({
    createdBy: "",
    createdOn: "",
    loading: false,
    showDetails: true,
    loadingEditIndicator: false,
    openDeleteDialog: false,
    dataRequiredByUser: [],
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
        dataRequiredByUser: handleDataRequiredByUser(
          JSON.parse(response.visRef),
          JSON.parse(response.dataset)
        ),
      }));
    });
  }, []);

  const toggleDetails = () => {
    setState((p) => ({
      ...p,
      showDetails: !p.showDetails,
    }));
  };

  const handleEditIndicator = () => {
    const loadISCDetail = async (api, iscId) => {
      try {
        return await requestISCDetails(api, iscId);
      } catch (error) {
        console.log("Error requesting my indicators");
      }
    };
    setState((prevState) => ({
      ...prevState,
      loadingEditIndicator: true,
    }));
    loadISCDetail(api, params.id)
      .then((responseData) => {
        let parsedData = JSON.parse(JSON.stringify(responseData));
        parsedData.requirements = JSON.parse(parsedData.requirements);
        parsedData.dataset = JSON.parse(parsedData.dataset);
        parsedData.visRef = JSON.parse(parsedData.visRef);
        parsedData.lockedStep = JSON.parse(parsedData.lockedStep);
        parsedData.visRef.edit = true;
        sessionStorage.setItem("session_isc", JSON.stringify(parsedData));
      })
      .then(() => {
        setState((prevState) => ({
          ...prevState,
          loadingEditIndicator: false,
        }));
        navigate(`/isc/creator`);
      })
      .catch((error) => {
        setState((prevState) => ({
          ...prevState,
          loadingEditIndicator: false,
        }));
        console.error(error);
      });
  };

  const handleToggleDelete = () => {
    setState((prevState) => ({
      ...prevState,
      openDeleteDialog: !prevState.openDeleteDialog,
    }));
  };

  const handleDeleteIndicator = async () => {
    await requestDeleteISC(api, params.id)
      .then(() => {
        navigate(`/isc`);
        enqueueSnackbar("Indicator deleted successfully", {
          variant: "success",
        });
      })
      .catch((error) => console.error(error));
  };

  // * Helper functions
  function toSentenceCase(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // * Helper function to find the actual data used to create the indicator
  function handleDataRequiredByUser(visRef, dataset) {
    const selectedKeys = Object.keys(visRef.data.axisOptions).filter((key) =>
      key.includes("selected")
    );
    const selectedValues = selectedKeys.map(
      (key) => visRef.data.axisOptions[key]
    );
    return dataset.columns
      .filter((item) => selectedValues.includes(item.field))
      .map((item) => item.headerName);
  }

  return (
    <>
      <Grid container spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
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
          <Typography sx={{ color: "text.primary" }}>Preview ISC</Typography>
        </Breadcrumbs>
        <Grid size={{ xs: 12 }}>
          <Divider />
        </Grid>
        <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
          <Grid container justifyContent="center" spacing={2}>
            <Grid size={{ xs: 12, lg: 10, xl: 7 }}>
              {state.loading ? (
                <Skeleton variant="rounded" height={500} />
              ) : (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Grid container spacing={1}>
                        <Grid size="grow">
                          <Typography variant="h5" gutterBottom>
                            {toSentenceCase(requirements.indicatorName)}
                          </Typography>
                          {state.showDetails && (
                            <Typography gutterBottom variant="body2">
                              Created on: {state.createdOn.split("T")[0]}
                            </Typography>
                          )}
                        </Grid>
                        <Grid size="auto">
                          <Grid container>
                            <Tooltip
                              arrow
                              title={<Typography>Hide details</Typography>}
                            >
                              <IconButton
                                color="primary"
                                onClick={toggleDetails}
                              >
                                {state.showDetails ? (
                                  <VisibilityOffIcon />
                                ) : (
                                  <VisibilityIcon />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip
                              arrow
                              title={<Typography>Edit indicator</Typography>}
                            >
                              <IconButton
                                color="primary"
                                onClick={handleEditIndicator}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>

                            <Divider
                              orientation="vertical"
                              flexItem
                              sx={{ mx: 1 }}
                            />

                            <Tooltip
                              arrow
                              title={<Typography>Edit indicator</Typography>}
                            >
                              <IconButton
                                color="error"
                                onClick={handleToggleDelete}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                            <DeleteDialog
                              open={state.openDeleteDialog}
                              toggleOpen={handleToggleDelete}
                              message={
                                <Typography>
                                  This will delete the indicator permanently
                                  from your dashboard.
                                </Typography>
                              }
                              handleDelete={handleDeleteIndicator}
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                    {state.showDetails && (
                      <>
                        <Grid size={{ xs: 12 }}>
                          <Divider />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Typography variant="overline">
                            I want to (goal)
                          </Typography>
                          <Grid size={{ xs: 12 }}>
                            <Chip label={requirements.goalType?.category} />
                          </Grid>
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                          <Typography variant="overline">
                            I am interested in (question)
                          </Typography>
                          <Grid size={{ xs: 12 }}>
                            <Chip label={requirements.question} />
                          </Grid>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="overline">
                            I need an indicator showing
                          </Typography>
                          <Grid size={{ xs: 12 }}>
                            <Chip label={requirements.indicatorName} />
                          </Grid>
                        </Grid>
                        <Grid size={{ xs: 12 }} sx={{ pt: 1 }}>
                          <Divider />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="overline">
                            I need the following data
                          </Typography>
                          <Grid container spacing={1}>
                            {state.dataRequiredByUser.map((data, index) => (
                              <Grid item key={index}>
                                <Chip label={data} />
                              </Grid>
                            ))}
                          </Grid>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="overline">
                            I need the following chart (Idiom)
                          </Typography>
                          <Grid size={{ xs: 12 }}>
                            <Chip label={visRef.chart?.type} />
                          </Grid>
                        </Grid>
                        <Grid size={{ xs: 12 }} sx={{ pt: 2 }}>
                          <Divider />
                        </Grid>
                      </>
                    )}
                    <Grid size={{ xs: 12 }}>
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
      <Backdrop
        sx={(theme) => ({
          color: "#fff",
          zIndex: theme.zIndex.drawer + 1,
        })}
        open={state.loadingEditIndicator}
      >
        <Grid container direction="column" alignItems="center" spacing={2}>
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>Loading Indicator</Typography>
        </Grid>
      </Backdrop>
    </>
  );
};

export default IscPreview;
