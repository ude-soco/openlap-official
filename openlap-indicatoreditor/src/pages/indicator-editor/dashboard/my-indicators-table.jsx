import React, {useContext, useEffect, useState} from "react";
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
import {fetchMyIndicators, fetchRequestIndicatorCode,} from "./utils/indicator-dashboard";
import {AuthContext} from "../../../setup/auth-context-manager/auth-context-manager";
import {ArrowDownward, ArrowUpward, ContentCopy, Delete, Edit, MoreVert, Preview,} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import {useSnackbar} from "notistack";
import {handleDisplayType} from "./utils/utils";

const MyIndicatorsTable = () => {
  const {api} = useContext(AuthContext);
  const [state, setState] = useState({
    myIndicators: [], pageable: {pageSize: 10, pageNumber: 0}, totalElements: 0, params: {
      page: 0, size: 10, sortDirection: "dsc", sortBy: "createdOn",
    },
  });
  const navigate = useNavigate();
  const {enqueueSnackbar} = useSnackbar();

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

  useEffect(() => {
    const loadMyIndicators = async (api, params) => {
      try {
        const myIndicatorsList = await fetchMyIndicators(api, params);

        setState((prevState) => ({
          ...prevState,
          myIndicators: myIndicatorsList.content,
          pageable: myIndicatorsList.pageable,
          totalElements: myIndicatorsList.totalElements,
        }));
      } catch (error) {
        console.log("Error requesting my indicators");
      }
    };

    loadMyIndicators(api, state.params);
  }, [api, state.params]);

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setState((prevState) => ({
      ...prevState, params: {
        ...prevState.params, page: newPage,
      },
    }));
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (event) => {
    setState((prevState) => ({
      ...prevState, params: {
        ...prevState.params, size: parseInt(event.target.value, 10), page: 0,
      },
    }));
  };

  // Handle sorting
  const handleSort = (sortBy) => {
    setState((prevState) => ({
      ...prevState, params: {
        ...prevState.params,
        sortBy,
        sortDirection: prevState.params.sortBy === sortBy && prevState.params.sortDirection === "asc" ? "dsc" : "asc",
        page: 0, // Reset to first page on sort change
      },
    }));
  };

  const renderSortIcon = (column) => {
    if (state.params.sortBy !== column) return null;
    return state.params.sortDirection === "asc" ? (<ArrowUpward fontSize="small"/>) : (
      <ArrowDownward fontSize="small"/>);
  };

  const handlePreview = () => {
    handleMenuClose();
    navigate(`/indicator/${selectedIndicator.id}`);
  };

  const handleEdit = () => {
    console.log("Edit indicator:", selectedIndicator);
    handleMenuClose();
  };

  const handleDuplicate = () => {
    console.log("Duplicate indicator:", selectedIndicator);
    handleMenuClose();
  };

  const handleCopyCode = () => {
    console.log("Copy code for indicator:", selectedIndicator);
    const loadIndicatorCode = async (api, indicatorId) => {
      try {
        const indicatorCode = await fetchRequestIndicatorCode(api, indicatorId);

        console.log(indicatorCode);
        enqueueSnackbar("Copied indicator code!", {variant: "success"});
      } catch (error) {
        enqueueSnackbar(error.response.data.message, {variant: "error"});
        console.error("Error requesting my indicators");
      }
    };

    loadIndicatorCode(api, selectedIndicator.id);
    handleMenuClose();
  };

  const handleDeleteIndicator = () => {
    console.log("Delete indicator:", selectedIndicator);
    handleMenuClose();
  };

  return (<>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container justifyContent="space-between">
            <Grid item xs>
              <Typography>My Indicators</Typography>
            </Grid>
            <Grid item>
              <Button variant="contained" size="small" onClick={() => navigate("/indicator/editor")}>
                Create new
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <TableContainer
            component={Paper}
            variant="outlined"
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Grid container alignItems="center">
                      <Typography
                        variant="overline"
                        sx={{fontWeight: "bold"}}
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
                        sx={{fontWeight: "bold"}}
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
                        sx={{fontWeight: "bold"}}
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
                    <Typography variant="overline" sx={{fontWeight: "bold"}}>
                      Actions
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.myIndicators.map((indicator) => (<TableRow key={indicator.id}>
                    <TableCell>{indicator.name}</TableCell>
                    <TableCell>{handleDisplayType(indicator.type)}</TableCell>
                    <TableCell align="right">{indicator.createdOn}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(event) => handleMenuOpen(event, indicator)}
                      >
                        <MoreVert/>
                      </IconButton>
                      <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                      >
                        <MenuItem onClick={handlePreview}>
                          <ListItemIcon>
                            <Preview fontSize="small" color="primary"/>
                          </ListItemIcon>
                          <ListItemText primary="Preview Indicator"/>
                        </MenuItem>
                        <MenuItem onClick={handleCopyCode}>
                          <ListItemIcon>
                            <ContentCopy fontSize="small" color="primary"/>
                          </ListItemIcon>
                          <ListItemText primary="Copy Code"/>
                        </MenuItem>
                        <Divider/>
                        <MenuItem onClick={handleEdit}>
                          <ListItemIcon>
                            <Edit fontSize="small" color="primary"/>
                          </ListItemIcon>
                          <ListItemText primary="Edit Indicator"/>
                        </MenuItem>
                        <MenuItem onClick={handleDuplicate}>
                          <ListItemIcon>
                            <ContentCopy fontSize="small" color="primary"/>
                          </ListItemIcon>
                          <ListItemText primary="Duplicate Indicator"/>
                        </MenuItem>
                        <MenuItem onClick={handleDeleteIndicator}>
                          <ListItemIcon>
                            <Delete fontSize="small" color="error"/>
                          </ListItemIcon>
                          <ListItemText primary="Delete Indicator"/>
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </TableRow>))}
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
    </>);
};

export default MyIndicatorsTable;
