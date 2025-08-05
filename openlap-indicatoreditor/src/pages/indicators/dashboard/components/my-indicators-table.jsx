import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import {
  requestIndicatorCode,
  requestIndicatorDeletion,
  requestMyIndicators,
} from "../utils/indicator-dashboard-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import {
  ArrowDownward,
  ArrowUpward,
  ContentCopy,
  Delete,
  Edit,
  Link,
  MoreVert,
  Preview,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { handleDisplayType } from "../utils/utils.js";
import DeleteDialog from "../../../../common/components/delete-dialog/delete-dialog.jsx";

const MyIndicatorsTable = () => {
  const { api } = useContext(AuthContext);
  const [state, setState] = useState({
    myIndicators: [],
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
    loadingIndicators: false,
    copyCode: {
      loading: false,
      code: "",
    },
  });
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedIndicator, setSelectedIndicator] = useState(null);

  const handleMenuOpen = (event, indicator) => {
    setAnchorEl(event.currentTarget);
    setSelectedIndicator(indicator);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedIndicator(null);
  };

  const toggleOpenDeleteDialog = () => {
    setState((prevState) => ({
      ...prevState,
      openDeleteDialog: !prevState.openDeleteDialog,
    }));
  };

  useEffect(() => {
    const loadMyIndicators = async (api, params) => {
      try {
        return await requestMyIndicators(api, params);
      } catch (error) {
        console.log("Error requesting my indicators");
      }
    };
    setState((prevState) => ({
      ...prevState,
      loadingIndicators: true,
    }));
    loadMyIndicators(api, state.params).then((response) => {
      setState((prevState) => ({
        ...prevState,
        myIndicators: response.content,
        pageable: response.pageable,
        totalElements: response.totalElements,
        loadingIndicators: false,
      }));
    });
  }, [api, state.params]);

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setState((prevState) => ({
      ...prevState,
      params: {
        ...prevState.params,
        page: newPage,
      },
    }));
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      params: {
        ...prevState.params,
        size: parseInt(event.target.value, 10),
        page: 0,
      },
    }));
  };

  // Handle sorting
  const handleSort = (sortBy) => {
    setState((prevState) => ({
      ...prevState,
      params: {
        ...prevState.params,
        sortBy,
        sortDirection:
          prevState.params.sortBy === sortBy &&
          prevState.params.sortDirection === "asc"
            ? "dsc"
            : "asc",
        page: 0, // Reset to first page on sort change
      },
    }));
  };

  const renderSortIcon = (column) => {
    if (state.params.sortBy !== column) return null;
    return state.params.sortDirection === "asc" ? (
      <ArrowUpward fontSize="small" />
    ) : (
      <ArrowDownward fontSize="small" />
    );
  };

  const handlePreview = () => {
    handleMenuClose();
    navigate(`/indicator/${selectedIndicator.id}`);
  };

  const handleEdit = () => {
    handleMenuClose();
  };

  const handleDuplicate = () => {
    handleMenuClose();
  };

  const handleCopyCode = () => {
    setState((prevState) => ({
      ...prevState,
      copyCode: {
        ...prevState.copyCode,
        loading: true,
      },
    }));
    const loadIndicatorCode = async (api, indicatorId) => {
      try {
        return await requestIndicatorCode(api, indicatorId);
      } catch (error) {
        setState((prevState) => ({
          ...prevState,
          copyCode: {
            ...prevState.copyCode,
            loading: false,
          },
        }));
        enqueueSnackbar(error.response.data.message, { variant: "error" });
        console.error("Error requesting my indicators");
      }
    };

    loadIndicatorCode(api, selectedIndicator.id).then((response) => {
      navigator.clipboard.writeText(response.data).then(() =>
        setState((prevState) => ({
          ...prevState,
          copyCode: {
            code: response.data,
            loading: false,
          },
        }))
      );
      enqueueSnackbar(response.message, { variant: "success" });
      handleMenuClose();
    });
  };

  const confirmDeleteIndicator = () => {
    setState((prevState) => ({
      ...prevState,
      openDeleteDialog: true,
    }));
    setAnchorEl(null);
  };

  const handleDeleteIndicator = (callback) => {
    const deleteIndicator = async (api, indicatorId) => {
      try {
        return await requestIndicatorDeletion(api, indicatorId);
      } catch (error) {
        enqueueSnackbar(error.message, { variant: "error" });
      }
    };
    if (selectedIndicator !== null) {
      deleteIndicator(api, selectedIndicator.id).then((response) => {
        enqueueSnackbar(response.message, { variant: "success" });
        setState((prevState) => ({
          ...prevState,
          myIndicators: prevState.myIndicators.filter(
            (indicator) => indicator.id !== selectedIndicator.id
          ),
        }));
        callback();
      });
      handleMenuClose();
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container justifyContent="space-between">
            <Grid item xs>
              <Typography>My Indicators</Typography>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate("/indicator/editor")}
              >
                Create new
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <TableContainer component={Paper} variant="outlined">
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Grid container alignItems="center">
                      <Typography
                        variant="overline"
                        sx={{ fontWeight: "bold" }}
                      >
                        Name
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleSort("name")}
                      >
                        {renderSortIcon("name")}
                      </IconButton>
                    </Grid>
                  </TableCell>
                  <TableCell>
                    <Grid container alignItems="center">
                      <Typography
                        variant="overline"
                        sx={{ fontWeight: "bold" }}
                      >
                        Type
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleSort("indicatorType")}
                      >
                        {renderSortIcon("indicatorType")}
                      </IconButton>
                    </Grid>
                  </TableCell>

                  <TableCell align="right">
                    <Grid
                      container
                      alignItems="center"
                      justifyContent="flex-end"
                    >
                      <Typography
                        variant="overline"
                        sx={{ fontWeight: "bold" }}
                      >
                        Created On
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleSort("createdOn")}
                      >
                        {renderSortIcon("createdOn")}
                      </IconButton>
                    </Grid>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="overline" sx={{ fontWeight: "bold" }}>
                      Actions
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.myIndicators.length > 0 ? (
                  state.myIndicators.map((indicator) => (
                    <TableRow key={indicator.id}>
                      <TableCell>{indicator.name}</TableCell>
                      <TableCell>{handleDisplayType(indicator.type)}</TableCell>
                      <TableCell align="right">
                        {indicator.createdOn.split("T")[0]}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(event) => handleMenuOpen(event, indicator)}
                        >
                          <MoreVert />
                        </IconButton>
                        <Menu
                          anchorEl={anchorEl}
                          open={Boolean(anchorEl)}
                          onClose={handleMenuClose}
                        >
                          <MenuItem onClick={handlePreview}>
                            <ListItemIcon>
                              <Preview fontSize="small" color="primary" />
                            </ListItemIcon>
                            <ListItemText primary="Preview Indicator" />
                          </MenuItem>
                          <MenuItem
                            onClick={handleCopyCode}
                            disabled={state.copyCode.loading}
                          >
                            {state.copyCode.loading ? (
                              <>
                                <ListItemIcon>
                                  <CircularProgress size={15} />
                                </ListItemIcon>
                                <ListItemText primary="Copying code" />
                              </>
                            ) : (
                              <>
                                <ListItemIcon>
                                  <Link fontSize="small" color="primary" />
                                </ListItemIcon>
                                <ListItemText primary="Copy Code" />
                              </>
                            )}
                          </MenuItem>
                          <Divider />
                          {/* <MenuItem onClick={handleEdit} disabled>
                            <ListItemIcon>
                              <Edit fontSize="small" color="primary" />
                            </ListItemIcon>
                            <ListItemText primary="Edit Indicator" />
                          </MenuItem>
                          <MenuItem onClick={handleDuplicate} disabled>
                            <ListItemIcon>
                              <ContentCopy fontSize="small" color="primary" />
                            </ListItemIcon>
                            <ListItemText primary="Duplicate Indicator" />
                          </MenuItem> */}
                          <MenuItem onClick={confirmDeleteIndicator}>
                            <ListItemIcon>
                              <Delete fontSize="small" color="error" />
                            </ListItemIcon>
                            <ListItemText primary="Delete Indicator" />
                          </MenuItem>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 1.5 }}>
                      {state.loadingIndicators ? (
                        <>
                          <Grid container alignItems="center" spacing={1}>
                            <Grid item>
                              <CircularProgress size={18} />
                            </Grid>
                            <Grid item>
                              <Typography variant="body2" gutterBottom>
                                Loading your indicators ...
                              </Typography>
                            </Grid>
                          </Grid>
                        </>
                      ) : (
                        "No indicators found"
                      )}
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
              rowsPerPageOptions={[5, 10, 25]}
            />
          </TableContainer>
        </Grid>
      </Grid>
      <DeleteDialog
        open={state.openDeleteDialog}
        toggleOpen={toggleOpenDeleteDialog}
        message="This will delete this indicator permanently. You cannot undo this action."
        handleDelete={handleDeleteIndicator}
      />
    </>
  );
};

export default MyIndicatorsTable;
