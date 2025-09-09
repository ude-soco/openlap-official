import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  Grid,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PreviewIcon from "@mui/icons-material/Preview";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import {
  requestDeleteISC,
  requestISCDetails,
  requestMyISCs,
} from "../utils/dashboard-api";
import CustomDialog from "../../../../common/components/custom-dialog/custom-dialog";

export default function MyIscTable() {
  const { api, SESSION_ISC } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState({
    indicatorList: [],
    pageable: {
      pageSize: 10,
      pageNumber: 0,
    },
    totalElements: 0,
    params: {
      page: 0,
      size: 10,
      sortDirection: "dsc",
      sortBy: "createdOn",
    },
    openDeleteDialog: false,
    isLoading: { status: false, indicator: undefined },
    loadingMyIndicatorList: false,
    onHoverIndicatorId: undefined,
    toggleSearch: true,
    searchTerm: "",
    filteredIndicatorList: [],
  });

  const loadMyISCList = async (api, params) => {
    setState((p) => ({
      ...p,
      indicatorList: [],
      loadingMyIndicatorList: true,
    }));
    try {
      const response = await requestMyISCs(api, params);
      setState((p) => ({
        ...p,
        indicatorList: response.content,
        pageable: response.pageable,
        totalElements: response.totalElements,
        loadingMyIndicatorList: false,
      }));
    } catch (error) {
      setState((p) => ({ ...p, loadingMyIndicatorList: false }));
      enqueueSnackbar("Error requesting my indicators", {
        variant: "error",
      });
    }
  };

  useEffect(() => {
    loadMyISCList(api, state.params);
  }, []);

  useEffect(() => {
    const filtered = state.indicatorList.filter((indicator) =>
      indicator.indicatorName
        .toLowerCase()
        .includes(state.searchTerm.toLowerCase())
    );
    setState((p) => ({ ...p, filteredIndicatorList: filtered }));
  }, [state.searchTerm, state.indicatorList]);

  const handleOnHoverIndicator = (id) => {
    setState((p) => ({ ...p, onHoverIndicatorId: id }));
  };

  const handlePreview = (id) => {
    navigate(`/isc/${id}`);
  };

  const handleEditIndicator = async () => {
    setState((p) => ({
      ...p,
      isLoading: {
        ...p.isLoading,
        status: true,
        indicator: p.onHoverIndicatorId,
      },
    }));
    try {
      const responseData = await requestISCDetails(
        api,
        state.onHoverIndicatorId
      );
      let parsedData = JSON.parse(JSON.stringify(responseData));
      parsedData.requirements = JSON.parse(parsedData.requirements);
      parsedData.dataset = JSON.parse(parsedData.dataset);
      parsedData.visRef = JSON.parse(parsedData.visRef);
      parsedData.lockedStep = JSON.parse(parsedData.lockedStep);
      parsedData.visRef.edit = true;
      sessionStorage.setItem(SESSION_ISC, JSON.stringify(parsedData));
      setState((p) => ({
        ...p,
        isLoading: {
          ...p.isLoading,
          status: false,
          indicator: undefined,
        },
      }));
      navigate(`/isc/creator/edit/${state.onHoverIndicatorId}`);
    } catch (error) {
      console.error("Error requesting my indicators", error);
    }
  };

  const handleToggleDelete = () => {
    setState((p) => ({ ...p, openDeleteDialog: !p.openDeleteDialog }));
  };

  const handleDeleteIndicator = async () => {
    await requestDeleteISC(api, state.onHoverIndicatorId)
      .then(() => {
        setState((p) => ({
          ...p,
          indicatorList: p.indicatorList.filter(
            (item) => item.id !== state.onHoverIndicatorId
          ),
        }));
        enqueueSnackbar("Indicator deleted successfully", {
          variant: "success",
        });
      })
      .catch((error) => console.error(error));
  };

  const handlePageChange = (event, newPage) => {
    setState((p) => ({ ...p, params: { ...p.params, page: newPage } }));
  };

  // * Handle rows per page change
  const handleRowsPerPageChange = (event) => {
    setState((p) => ({
      ...p,
      params: { ...p.params, size: parseInt(event.target.value, 10), page: 0 },
    }));
  };

  const handleToggleSearch = () => {
    setState((p) => ({ ...p, searchTerm: "", toggleSearch: !p.toggleSearch }));
  };

  const handleSearchTerm = (event) => {
    const { value } = event.target;
    setState((p) => ({ ...p, searchTerm: value }));
  };

  const handleClearSession = () => {
    setState((p) => ({ ...p, indicatorInProgress: !p.indicatorInProgress }));
    sessionStorage.removeItem(SESSION_ISC);
  };

  const handleCreateNew = () => {
    // TODO: Another check need if there is exist a draft
    handleClearSession();
    navigate("/isc/creator");
  };

  // * Helper functions
  function toSentenceCase(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function changeTimeFormat(time) {
    return new Date(time).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid size={12}>
          <TableContainer component={Paper} elevation={0} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Grid container alignItems="center" spacing={1}>
                      <Button
                        startIcon={<AddIcon />}
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={handleCreateNew}
                      >
                        Create New
                      </Button>
                      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                      {state.toggleSearch ? (
                        <>
                          <Typography>Search</Typography>
                          <Tooltip
                            title={<Typography>Search for ISC</Typography>}
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={handleToggleSearch}
                              >
                                <SearchIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Grid>
                            <TextField
                              autoFocus
                              size="small"
                              placeholder="Search for ISC"
                              value={state.searchTerm}
                              onChange={handleSearchTerm}
                            />
                          </Grid>
                          <Grid size="auto">
                            <Tooltip
                              title={<Typography>Close search</Typography>}
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={handleToggleSearch}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.filteredIndicatorList.map((indicator) => (
                  <React.Fragment key={indicator.id}>
                    <TableRow
                      onMouseEnter={() => handleOnHoverIndicator(indicator.id)}
                      hover
                      sx={{
                        cursor: "pointer",
                        position: "relative",
                        "&:hover .hover-actions": { opacity: 1 },
                        "&:hover .time-text": { opacity: 0 },
                      }}
                    >
                      <TableCell onClick={() => handlePreview(indicator.id)}>
                        <Grid container justifyContent="space-between">
                          <Grid size="grow">
                            <Typography component="span" fontWeight="bold">
                              {toSentenceCase(indicator.indicatorName)}
                            </Typography>
                            <Typography variant="body2">
                              Created on:{" "}
                              {changeTimeFormat(indicator.createdOn)}
                            </Typography>
                          </Grid>
                          <Grid size="auto">
                            <Box
                              className="hover-actions"
                              sx={{
                                position: "absolute",
                                right: 0,
                                top: "50%",
                                transform: "translateY(-50%)",
                                display: "flex",
                                gap: 1,
                                opacity: 0,
                                transition: "opacity 0.2s ease-in-out",
                                zIndex: 2,
                                mr: 2,
                              }}
                            >
                              <Tooltip
                                arrow
                                title={
                                  <Typography>Preview indicator</Typography>
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handlePreview(indicator.id)}
                                    disabled={state.isLoading.status}
                                  >
                                    <PreviewIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip
                                arrow
                                title={<Typography>Edit indicator</Typography>}
                              >
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={handleEditIndicator}
                                  disabled={state.isLoading.status}
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
                                title={
                                  <Typography>Delete indicator</Typography>
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={handleToggleDelete}
                                    disabled={state.isLoading.status}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          </Grid>
                        </Grid>
                      </TableCell>
                    </TableRow>
                    {state.isLoading.status &&
                      indicator.id === state.isLoading.indicator && (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ padding: 0 }}>
                            <LinearProgress />
                          </TableCell>
                        </TableRow>
                      )}
                  </React.Fragment>
                ))}
                {state.loadingMyIndicatorList && (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ padding: 0 }}>
                      <LinearProgress />
                    </TableCell>
                  </TableRow>
                )}
                {state.filteredIndicatorList.length === 0 &&
                  !state.loadingMyIndicatorList && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Box>
                          {state.searchTerm.length > 0 ? (
                            <Typography>
                              <em>No indicators found with this name!</em>
                            </Typography>
                          ) : (
                            <Box
                              sx={{
                                p: 8,
                                textAlign: "center",
                                color: "text.secondary",
                              }}
                            >
                              <Typography variant="body1" gutterBottom>
                                No ISCs created yet. Click "Create new" to get
                                started.
                              </Typography>
                              <Button
                                variant="contained"
                                onClick={handleCreateNew}
                              >
                                Create New
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={state.totalElements}
              page={state.pageable.pageNumber}
              onPageChange={handlePageChange}
              rowsPerPage={state.pageable.pageSize}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[5, 10, 20, 50]}
            />
          </TableContainer>
        </Grid>
      </Grid>
      <CustomDialog
        type="delete"
        content={`This will delete the indicator permanently from your dashboard.`}
        open={state.openDeleteDialog}
        toggleOpen={handleToggleDelete}
        handler={handleDeleteIndicator}
      />
    </>
  );
}
