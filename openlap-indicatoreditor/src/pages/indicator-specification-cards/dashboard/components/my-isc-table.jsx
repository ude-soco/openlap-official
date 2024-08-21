import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { requestMyISCs } from "../utils/dashboard-api.js";
import {
  Button,
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
} from "@mui/icons-material";

const MyIscTable = () => {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
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
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  console.log(selectedIndicator);
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

  const handlePreview = () => {
    handleMenuClose();
    navigate(`/isc/${selectedIndicator.id}`);
  };

  useEffect(() => {
    const loadMyISCList = async (api, params) => {
      try {
        return await requestMyISCs(api, params);
      } catch (error) {
        console.log("Error requesting my indicators");
      }
    };
    loadMyISCList(api, state.params).then((response) => {
      setState((prevState) => ({
        ...prevState,
        myISCList: response.content,
        pageable: response.pageable,
        totalElements: response.totalElements,
      }));
    });
  }, [api, state.params]);

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
            <Table stickyHeader>
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
                {state.myISCList.map((indicator) => (
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
                          <ListItemText primary="Preview Indicator" />
                        </MenuItem>
                        <Divider />
                        {/*<MenuItem onClick={handleEdit} disabled>*/}
                        {/*  <ListItemIcon>*/}
                        {/*    <Edit fontSize="small" color="primary" />*/}
                        {/*  </ListItemIcon>*/}
                        {/*  <ListItemText primary="Edit Indicator" />*/}
                        {/*</MenuItem>*/}
                        {/*<MenuItem onClick={handleDuplicate} disabled>*/}
                        {/*  <ListItemIcon>*/}
                        {/*    <ContentCopy fontSize="small" color="primary" />*/}
                        {/*  </ListItemIcon>*/}
                        {/*  <ListItemText primary="Duplicate Indicator" />*/}
                        {/*</MenuItem>*/}
                        {/*<MenuItem onClick={confirmDeleteIndicator}>*/}
                        {/*  <ListItemIcon>*/}
                        {/*    <Delete fontSize="small" color="error" />*/}
                        {/*  </ListItemIcon>*/}
                        {/*  <ListItemText primary="Delete Indicator" />*/}
                        {/*</MenuItem>*/}
                      </Menu>
                    </TableCell>
                  </TableRow>
                ))}
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
