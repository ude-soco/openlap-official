import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
import {
  requestDeleteISC,
  requestISCDetails,
  requestMyISCs,
} from "../utils/dashboard-api.js";
import {
  Button,
  Backdrop,
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
  ArrowDownward,
  ArrowUpward,
  MoreVert,
  Preview,
  Delete,
  Edit,
} from "@mui/icons-material";
import DeleteDialog from "../../../../common/components/delete-dialog/delete-dialog.jsx";

const MyIscTable = () => {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState({
    myISCList: [],
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
    loadingEditIndicator: false,
  });
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

  const handleToggleDelete = () => {
    setState((prevState) => ({
      ...prevState,
      openDeleteDialog: !prevState.openDeleteDialog,
    }));
  };

  const handlePreview = () => {
    handleMenuClose();
    navigate(`/isc/${selectedIndicator.id}`);
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
    loadISCDetail(api, selectedIndicator.id)
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

  const handleDeleteIndicator = async () => {
    await requestDeleteISC(api, selectedIndicator.id)
      .then(() => {
        handleMenuClose();
        setState((prevState) => ({
          ...prevState,
          myISCList: prevState.myISCList.filter(
            (item) => item.id !== selectedIndicator.id
          ),
        }));
        enqueueSnackbar("Indicator deleted successfully", {
          variant: "success",
        });
      })
      .catch((error) => console.error(error));
  };

  useEffect(() => {
    const loadMyISCList = async (api, params) => {
      try {
        return await requestMyISCs(api, params);
      } catch (error) {
        console.log("Error requesting my indicators", error);
        enqueueSnackbar("Error requesting my indicators", {
          variant: "error",
        });
      }
    };
    setState((prevState) => ({
      ...prevState,
      loadingIndicators: true,
    }));
    loadMyISCList(api, state.params).then((response) => {
      setState((prevState) => ({
        ...prevState,
        myISCList: response.content,
        pageable: response.pageable,
        totalElements: response.totalElements,
        loadingIndicators: false,
      }));
    });
  }, [api, state.params, location]);

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container justifyContent="space-between">
            <Grid item xs>
              <Typography>My ISCs</Typography>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate("/isc/creator")}
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
                {state.myISCList.length > 0 ? (
                  state.myISCList.map((indicator) => (
                    <TableRow key={indicator.id}>
                      <TableCell>{indicator.indicatorName}</TableCell>
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
                            <ListItemText primary="Preview" />
                          </MenuItem>
                          <MenuItem onClick={handleEditIndicator}>
                            <ListItemIcon>
                              <Edit fontSize="small" color="primary" />
                            </ListItemIcon>
                            <ListItemText primary="Edit" />
                          </MenuItem>
                          <Backdrop
                            sx={(theme) => ({
                              color: "#fff",
                              zIndex: theme.zIndex.drawer + 1,
                            })}
                            open={state.loadingEditIndicator}
                          >
                            <Grid
                              container
                              direction="column"
                              alignItems="center"
                              spacing={2}
                            >
                              <CircularProgress color="inherit" />
                              <Typography sx={{ mt: 2 }}>
                                Loading Indicator
                              </Typography>
                            </Grid>
                          </Backdrop>
                          <Divider />

                          <MenuItem onClick={handleToggleDelete}>
                            <ListItemIcon>
                              <Delete fontSize="small" color="error" />
                            </ListItemIcon>
                            <ListItemText primary="Delete" />
                          </MenuItem>
                          <DeleteDialog
                            open={state.openDeleteDialog}
                            toggleOpen={handleToggleDelete}
                            message={
                              <Typography>
                                This will delete the indicator permanently. Are
                                you sure?
                              </Typography>
                            }
                            handleDelete={handleDeleteIndicator}
                          />
                          {/* Uncommented menu items */}
                        </Menu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 1.5 }}>
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
    </>
  );
};

export default MyIscTable;
