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
  Grid,
  IconButton,
  Tooltip,
  Backdrop,
  CircularProgress,
  LinearProgress,
  Stack,
  Container,
  Box,
  Switch,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import BarChartIcon from "@mui/icons-material/BarChart";
import DatasetIcon from "@mui/icons-material/Dataset";
import DeleteIcon from "@mui/icons-material/Delete";
import { Link as RouterLink } from "react-router-dom";
import PreviewChart from "./preview-chart.jsx";
import DeleteDialog from "../../../../common/components/delete-dialog/delete-dialog.jsx";
import { useSnackbar } from "notistack";
import DataTable from "../../creator/components/dataset/components/data-table.jsx";

const DATA = "data";
const VIS = "vis";

const IscPreview = () => {
  const { api, SESSION_ISC } = useContext(AuthContext);
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
    isLoading: { status: false },
    loadingEditIndicator: false,
    openDeleteDialog: false,
    dataRequiredByUser: [],
  });
  const [showDataset, setShowDataset] = useState(false);
  const [showVisData, setShowVisData] = useState([VIS]);

  useEffect(() => {
    loadingISCPreviewDetails(params.id);
  }, []);

  const loadingISCPreviewDetails = async (id) => {
    setState((p) => ({ ...p, loading: true }));
    try {
      const details = await requestISCDetails(api, id);
      setRequirements(JSON.parse(details.requirements));
      setDataset(JSON.parse(details.dataset));
      setVisRef(JSON.parse(details.visRef));
      setState((p) => ({
        ...p,
        createdBy: details.createdBy,
        createdOn: details.createdOn,
        dataRequiredByUser: handleDataRequiredByUser(
          JSON.parse(details.visRef),
          JSON.parse(details.dataset)
        ),
      }));
    } catch (error) {
      console.log("Error requesting my indicators");
    } finally {
      setState((p) => ({ ...p, loading: false }));
    }
  };

  const handleEditIndicator = async () => {
    setState((p) => ({ ...p, isLoading: { ...p.isLoading, status: true } }));
    try {
      const responseData = await requestISCDetails(api, params.id);
      let parsedData = JSON.parse(JSON.stringify(responseData));
      parsedData.requirements = JSON.parse(parsedData.requirements);
      parsedData.dataset = JSON.parse(parsedData.dataset);
      parsedData.visRef = JSON.parse(parsedData.visRef);
      parsedData.lockedStep = JSON.parse(parsedData.lockedStep);
      parsedData.visRef.edit = true;
      sessionStorage.setItem(SESSION_ISC, JSON.stringify(parsedData));
      navigate(`/isc/creator/edit/${params.id}`);
    } catch (error) {
      console.error("Error requesting my indicators");
    } finally {
      setState((p) => ({ ...p, isLoading: { ...p.isLoading, status: false } }));
    }
  };

  const handleToggleDelete = () => {
    setState((p) => ({ ...p, openDeleteDialog: !p.openDeleteDialog }));
  };

  const handleDeleteIndicator = async () => {
    setState((p) => ({ ...p, isLoading: { ...p.isLoading, status: true } }));
    try {
      await requestDeleteISC(api, params.id);
      enqueueSnackbar("Indicator deleted successfully", { variant: "success" });
      handleToggleDelete();
      navigate("/isc");
    } catch (error) {
      console.error(error);
    } finally {
      setState((p) => ({ ...p, isLoading: { ...p.isLoading, status: false } }));
    }
  };

  const toggleShowDataset = () => {
    setShowDataset((p) => !p);
  };

  const handleShowVisData = (events, options) => {
    setShowVisData(options);
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
      <Stack gap={2}>
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
            My ISCs
          </Link>
          <Typography sx={{ color: "text.primary" }}>Preview ISC</Typography>
        </Breadcrumbs>
        <Divider />
        <Container maxWidth="lg">
          {state.loading ? (
            <Skeleton variant="rounded" height={500} />
          ) : (
            <>
              {state.isLoading.status && <LinearProgress />}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack gap={3}>
                  <Grid container spacing={1}>
                    <Grid size="grow">
                      <Typography variant="h5" gutterBottom>
                        {toSentenceCase(requirements.indicatorName)}
                      </Typography>
                      <Typography gutterBottom variant="body2">
                        Created on: {state.createdOn.split("T")[0]}
                      </Typography>
                    </Grid>
                    <Grid size="auto">
                      <Grid container>
                        <Tooltip
                          arrow
                          title={<Typography>Edit indicator</Typography>}
                        >
                          <span>
                            <IconButton
                              color="primary"
                              onClick={handleEditIndicator}
                              disabled={state.isLoading.status}
                            >
                              <EditIcon />
                            </IconButton>
                          </span>
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
                          <span>
                            <IconButton
                              color="error"
                              onClick={handleToggleDelete}
                              disabled={state.isLoading.status}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <DeleteDialog
                          open={state.openDeleteDialog}
                          toggleOpen={handleToggleDelete}
                          message={
                            <Typography>
                              This will delete the indicator permanently from
                              your dashboard.
                            </Typography>
                          }
                          handleDelete={handleDeleteIndicator}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Divider />
                  <Stack>
                    <Typography variant="overline">I want to (goal)</Typography>
                    <Box>
                      <Chip label={requirements.goalType?.category} />
                    </Box>
                  </Stack>
                  <Stack>
                    <Typography variant="overline">
                      I am interested in knowing (question)
                    </Typography>
                    <Box>
                      <Chip label={requirements.question} />
                    </Box>
                  </Stack>
                  <Stack>
                    <Typography variant="overline">
                      I need an indicator that shows
                    </Typography>
                    <Box>
                      <Chip label={requirements.indicatorName} />
                    </Box>
                  </Stack>
                  <Divider />
                  <Stack direction="row" gap={2}>
                    <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                      <Stack>
                        <Typography variant="overline">
                          I need the following data
                        </Typography>
                        <Stack direction="row" gap={1}>
                          {state.dataRequiredByUser.map((data, index) => (
                            <Box key={index}>
                              <Chip label={data} />
                            </Box>
                          ))}
                        </Stack>
                      </Stack>
                    </Box>
                    <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                      <Stack>
                        <Typography variant="overline">
                          I need the following chart (Idiom)
                        </Typography>
                        <Box>
                          <Chip label={visRef.chart?.type} />
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>
                  <Divider />
                  {Object.values(visRef).length > 0 && (
                    <>
                      <Stack gap={1}>
                        <Grid
                          container
                          spacing={1}
                          justifyContent="flex-end"
                          alignItems="center"
                        >
                          <ToggleButtonGroup
                            value={showVisData}
                            onChange={handleShowVisData}
                          >
                            <Tooltip arrow title="Show visualization">
                              <ToggleButton value={VIS}>
                                <BarChartIcon />
                              </ToggleButton>
                            </Tooltip>
                            <Tooltip arrow title="Show dataset">
                              <ToggleButton value={DATA}>
                                <DatasetIcon />
                              </ToggleButton>
                            </Tooltip>
                          </ToggleButtonGroup>
                        </Grid>
                        {showVisData.find((item) => item === DATA) && (
                          <DataTable
                            rows={dataset.rows}
                            columns={dataset.columns}
                          />
                        )}
                      </Stack>
                      {showDataset && <Divider />}
                      {showVisData.find((item) => item === VIS) && (
                        <PreviewChart dataset={dataset} visRef={visRef} />
                      )}
                    </>
                  )}
                </Stack>
              </Paper>
            </>
          )}
        </Container>
      </Stack>
      <Backdrop
        sx={(theme) => ({ color: "#fff", zIndex: theme.zIndex.drawer + 1 })}
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
