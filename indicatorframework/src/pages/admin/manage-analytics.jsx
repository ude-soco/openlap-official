import {
  Box,
  Breadcrumbs,
  Button,
  Container,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { useSnackbar } from "notistack";
import {
  requestAnalyticsMethods,
  requestUploadAnalyticsJar,
} from "./utils/manage-apis";
import AnalyticsTable from "./analytics-table";

const ManageAnalytics = () => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState({
    loadingUpload: false,
    analyticsList: [],
    loadingAnalytics: false,
    selectedAnalytics: {},
    openDeleteDialog: false,
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setState((p) => ({ ...p, loadingAnalytics: true }));
    try {
      const analyticsList = await requestAnalyticsMethods(api);
      if (analyticsList.data.length > 0) {
        enqueueSnackbar(analyticsList.message, { variant: "success" });
        setState((p) => ({ ...p, analyticsList: analyticsList.data }));
      }
    } catch (error) {
      enqueueSnackbar("Error loading analytics method data", {
        variant: "error",
      });
    } finally {
      setState((p) => ({ ...p, loadingAnalytics: false }));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".jar")) {
      enqueueSnackbar("Please upload a valid .jar file.", {
        variant: "error",
      });
      return;
    }

    setState((p) => ({ ...p, loadingUpload: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      const messageUpload = await requestUploadAnalyticsJar(api, formData);
      enqueueSnackbar(messageUpload, { variant: "success" });
      await loadAnalytics();
    } catch (error) {
      enqueueSnackbar("An error occurred while uploading the file.", {
        variant: "error",
      });
    } finally {
      setState((p) => ({ ...p, loadingUpload: false }));
    }
  };

  const handleDeleteAnalytics = (analyticsId) => {
    setState((p) => {
      const newAnalyticsList = [...state.analyticsList].filter(
        (item) => item.id !== analyticsId
      );
      return { ...p, analyticsList: newAnalyticsList };
    });
  };

  return (
    <>
      <Stack gap={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography color="textPrimary">Analytics Method</Typography>
        </Breadcrumbs>
        <Divider />
      </Stack>
      <Container maxWidth="lg" sx={{ pt: 2 }}>
        <Stack gap={2}>
          <Box
            sx={{
              mt: 2,
              pb: 1,
              p: 8,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
              textAlign: "center",
              color: "text.secondary",
            }}
          >
            <Typography variant="body1" gutterBottom>
              Upload a JAR file that consists of your Analytics Methods
            </Typography>

            {/* Hidden file input */}
            <input
              type="file"
              accept=".jar"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <Button
              loading={state.loadingUpload}
              loadingPosition="start"
              loadingIndicator="Please wait..."
              autoFocus
              variant="contained"
              onClick={handleUploadClick}
            >
              {!state.loadingUpload ? "Upload JAR" : "Please wait..."}
            </Button>
          </Box>
          {state.analyticsList.length > 0 && (
            <AnalyticsTable
              analyticsList={state.analyticsList}
              handleDeleteAnalytics={handleDeleteAnalytics}
            />
          )}
        </Stack>
      </Container>
    </>
  );
};

export default ManageAnalytics;
