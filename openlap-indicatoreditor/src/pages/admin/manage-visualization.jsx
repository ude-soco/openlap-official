import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Divider,
  Stack,
  Typography,
  Breadcrumbs,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { Link as RouterLink } from "react-router-dom";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { useSnackbar } from "notistack";
import {
  requestDeleteVisualizationLibraryById,
  requestUploadVisualizationJar,
  requestVisualizationLibraries,
  requestVisualizationTypesByLibraryId,
} from "./utils/manage-apis";
import VisualizationTypeTable from "./visualization-type-table";
import CustomDialog from "../../common/components/custom-dialog/custom-dialog";

const ManageVisualization = () => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState({
    loadingUpload: false,
    libraryList: [],
    loadingLibraries: false,
    selectedLibrary: {},
    openDeleteDialog: false,
    typeList: [],
    loadingTypes: false,
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadLibraries();
  }, []);

  const loadLibraries = async () => {
    setState((p) => ({ ...p, loadingLibraries: true }));
    try {
      const libraryList = await requestVisualizationLibraries(api);
      enqueueSnackbar(libraryList.message, { variant: "success" });
      setState((p) => ({ ...p, libraryList: libraryList.data }));
    } catch (error) {
      enqueueSnackbar("Error loading libraries", { variant: "error" });
    } finally {
      setState((p) => ({ ...p, loadingLibraries: false }));
    }
  };

  const handleSelectLibrary = async (event) => {
    const { value } = event.target;
    setState((p) => ({ ...p, loadingTypes: true }));
    try {
      const typeList = await requestVisualizationTypesByLibraryId(
        api,
        value.id
      );
      enqueueSnackbar(typeList.message, { variant: "success" });
      setState((p) => ({
        ...p,
        selectedLibrary: value,
        typeList: typeList.data,
      }));
    } catch (error) {
      enqueueSnackbar("Error loading charts", { variant: "error" });
    } finally {
      setState((p) => ({ ...p, loadingTypes: false }));
    }
  };

  const handleToggleDelete = () => {
    setState((p) => ({ ...p, openDeleteDialog: !p.openDeleteDialog }));
  };

  const handleDeleteLibrary = async () => {
    setState((p) => ({ ...p, isLoading: true }));
    try {
      const response = await requestDeleteVisualizationLibraryById(
        api,
        state.selectedLibrary.id
      );
      const filteredLibrary = [...state.libraryList].filter(
        (item) => item.id !== state.selectedLibrary.id
      );
      setState((p) => ({
        ...p,
        selectedLibrary: {},
        libraryList: filteredLibrary,
        typeList: [],
      }));
      enqueueSnackbar(response.message, { variant: "success" });
    } catch (error) {
      enqueueSnackbar("Failed to delete visualization library", {
        variant: "error",
      });
    } finally {
      setState((p) => ({ ...p, isLoading: false }));
    }
  };

  const handleDeleteType = (typeId) => {
    setState((p) => {
      const newTypeList = [...state.typeList].filter(
        (item) => item.id !== typeId
      );
      return { ...p, typeList: newTypeList };
    });
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

      const messageUpload = await requestUploadVisualizationJar(api, formData);

      enqueueSnackbar(messageUpload, { variant: "success" });

      const libraryList = await requestVisualizationLibraries(api);

      enqueueSnackbar(libraryList.message, { variant: "success" });
      setState((p) => ({ ...p, libraryList: libraryList.data }));
    } catch (error) {
      enqueueSnackbar("An error occurred while uploading the file.", {
        variant: "error",
      });
    } finally {
      setState((p) => ({ ...p, loadingUpload: false }));
    }
  };

  return (
    <>
      <Stack gap={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography color="textPrimary">Visualization Method</Typography>
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
              Upload a JAR file that consists of your Visualization Methods
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
              {!state.loadingUpload && "Upload JAR"}
            </Button>
          </Box>
          {state.libraryList.length > 0 && (
            <FormControl fullWidth>
              <InputLabel>Visualization Library</InputLabel>
              <Select
                label="Visualization Library"
                onChange={handleSelectLibrary}
              >
                {state.libraryList.map((item) => {
                  return (
                    <MenuItem key={item.id} value={item}>
                      {item.name}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}
          {Object.keys(state.selectedLibrary).length !== 0 && (
            <>
              <Stack direction="row" gap={1} alignItems="center">
                <Typography>
                  Selected Visualization Library:{" "}
                  <b>{state.selectedLibrary.name}</b>
                </Typography>
                <Tooltip
                  arrow
                  title={<Typography>Delete Visualization Library</Typography>}
                >
                  <IconButton
                    color="error"
                    size="small"
                    onClick={handleToggleDelete}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
              <VisualizationTypeTable
                typeList={state.typeList}
                handleDeleteType={handleDeleteType}
              />
            </>
          )}
        </Stack>
        <CustomDialog
          type="delete"
          content={`This will delete the visualization libary and the JAR file permanently.`}
          open={state.openDeleteDialog}
          toggleOpen={handleToggleDelete}
          handler={handleDeleteLibrary}
        />
      </Container>
    </>
  );
};

export default ManageVisualization;
