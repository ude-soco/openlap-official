import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Grid,
  Table,
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
import {
  requestIndicatorCode,
  requestIndicatorDeletion,
  requestIndicatorFullDetail,
  requestMyIndicatorDuplication,
  requestMyIndicators,
} from "../utils/indicator-dashboard-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import SearchIcon from "@mui/icons-material/Search";
import PreviewIcon from "@mui/icons-material/Preview";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CodeIcon from "@mui/icons-material/Code";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { handleDisplayType } from "../utils/utils.js";
import CustomDialog from "../../../../common/components/custom-dialog/custom-dialog.jsx";

const MyIndicatorsTable = () => {
  const { api, SESSION_INDICATOR } = useContext(AuthContext);
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

  const loadMyIndicatorList = async (api, params) => {
    setState((p) => ({ ...p, loadingMyIndicatorList: true }));
    try {
      const indicatorList = await requestMyIndicators(api, params);
      setState((p) => ({
        ...p,
        indicatorList: indicatorList.content,
        pageable: indicatorList.pageable,
        totalElements: indicatorList.totalElements,
        loadingMyIndicatorList: false,
      }));
    } catch (error) {
      console.log("Error requesting my indicators");
    } finally {
      setState((p) => ({ ...p, loadingMyIndicatorList: false }));
    }
  };

  useEffect(() => {
    loadMyIndicatorList(api, state.params);
  }, [state.params]);

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

  const handleCopyEmbedCode = async () => {
    setState((p) => ({
      ...p,
      isLoading: {
        ...p.isLoading,
        status: true,
        indicator: p.onHoverIndicatorId,
      },
    }));
    try {
      const indicatorCode = await requestIndicatorCode(
        api,
        state.onHoverIndicatorId
      );
      await navigator.clipboard.writeText(indicatorCode.data);
      enqueueSnackbar(indicatorCode.message, { variant: "success" });
      setState((p) => ({ ...p, isLoading: false }));
    } catch (error) {
      enqueueSnackbar(error.response.data.message, { variant: "error" });
    } finally {
      setState((p) => ({
        ...p,
        isLoading: {
          ...p.isLoading,
          status: false,
          indicator: undefined,
        },
      }));
    }
  };

  const handlePreview = (id) => {
    navigate(`/indicator/${id}`);
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
      const indicator = await requestIndicatorFullDetail(
        api,
        state.onHoverIndicatorId
      );
      let configuration = JSON.parse(indicator.configuration);
      let updatedConfiguration = {
        ...configuration,
        indicator: { ...configuration.indicator, id: state.onHoverIndicatorId },
      };
      sessionStorage.setItem(
        SESSION_INDICATOR,
        JSON.stringify(updatedConfiguration)
      );
      const baseRoutes = {
        BASIC: "/indicator/editor/basic/edit",
        COMPOSITE: "/indicator/editor/composite/edit",
        MULTI_LEVEL: "/indicator/editor/multi-level-analysis/edit",
      };

      const baseRoute = baseRoutes[indicator.type];

      navigate(`${baseRoute}/${state.onHoverIndicatorId}`);
    } catch (error) {
      console.error("Error requesting my indicators", error);
    } finally {
      setState((p) => ({
        ...p,
        isLoading: {
          ...p.isLoading,
          status: false,
          indicator: undefined,
        },
      }));
    }
  };

  const handleDuplicateMyIndicator = async () => {
    setState((p) => ({
      ...p,
      isLoading: {
        ...p.isLoading,
        status: true,
        indicator: p.onHoverIndicatorId,
      },
    }));
    try {
      const response = await requestMyIndicatorDuplication(
        api,
        state.onHoverIndicatorId
      );
      setState((p) => ({
        ...p,
        isLoading: {
          ...p.isLoading,
          status: false,
          indicator: undefined,
        },
      }));
      await loadMyIndicatorList(api, state.params);
      enqueueSnackbar(response.message, { variant: "success" });
    } catch (error) {
      setState((p) => ({
        ...p,
        isLoading: {
          ...p.isLoading,
          status: false,
          indicator: undefined,
        },
      }));
      console.error("Error duplication my indicator", error);
    }
  };

  const handleToggleDelete = () => {
    setState((p) => ({ ...p, openDeleteDialog: !p.openDeleteDialog }));
  };

  const handleDeleteIndicator = async () => {
    setState((p) => ({
      ...p,
      isLoading: {
        ...p.isLoading,
        status: true,
        indicator: p.onHoverIndicatorId,
      },
    }));
    try {
      const response = await requestIndicatorDeletion(
        api,
        state.onHoverIndicatorId
      );
      setState((p) => ({
        ...p,
        indicatorList: p.indicatorList.filter(
          (item) => item.id !== state.onHoverIndicatorId
        ),
        isLoading: {
          ...p.isLoading,
          status: false,
          indicator: undefined,
        },
      }));
      enqueueSnackbar(response.message, { variant: "success" });
    } catch (error) {
      setState((p) => ({
        ...p,
        isLoading: {
          ...p.isLoading,
          status: false,
          indicator: undefined,
        },
      }));
      enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  const handlePageChange = (event, newPage) => {
    setState((p) => ({ ...p, params: { ...p.params, page: newPage } }));
  };

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
    sessionStorage.removeItem(SESSION_INDICATOR);
  };

  const handleCreateNew = () => {
    handleClearSession();
    navigate("/indicator/editor");
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
                            title={
                              <Typography>Search for indicators</Typography>
                            }
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
                              placeholder="Search for indicator"
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
                            <Typography component="span">
                              <b>{toSentenceCase(indicator.indicatorName)}</b>
                              <br />
                              <Typography component="span" variant="caption">
                                {handleDisplayType(indicator.type)} ● Created
                                on: {changeTimeFormat(indicator.createdOn)}
                              </Typography>
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
                                title={
                                  <>
                                    <Typography gutterBottom>
                                      Copy ICC code
                                    </Typography>
                                    <Typography>
                                      What's an ICC code?
                                      <br />
                                      An Interactive Indicator Code (ICC) is an
                                      iFrame code snippet you can embed in any
                                      web application that supports iFrames.
                                      <br />
                                      It lets you display real-time analytics
                                      directly within your website.
                                    </Typography>
                                  </>
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={handleCopyEmbedCode}
                                    disabled={state.isLoading.status}
                                  >
                                    <CodeIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>

                              <Tooltip
                                arrow
                                title={<Typography>Edit indicator</Typography>}
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={handleEditIndicator}
                                    disabled={state.isLoading.status}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip
                                arrow
                                title={
                                  <Typography>Duplicate indicator</Typography>
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={handleDuplicateMyIndicator}
                                    disabled={state.isLoading.status}
                                  >
                                    <ContentCopyIcon />
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
                                No indicators created yet. Click "Create new" to
                                get started.
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
};

export default MyIndicatorsTable;
