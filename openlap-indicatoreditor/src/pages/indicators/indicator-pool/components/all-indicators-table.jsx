import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
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
  Chip,
} from "@mui/material";
import { requestAllIndicators } from "../utils/indicator-pool-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import SearchIcon from "@mui/icons-material/Search";
import PreviewIcon from "@mui/icons-material/Preview";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";

const AllIndicatorsTable = () => {
  const { api } = useContext(AuthContext);
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
    loadingIndicatorList: false,
    onHoverIndicatorId: undefined,
    toggleSearch: true,
    searchTerm: "",
    filteredIndicatorList: [],
  });

  const loadAllIndicatorList = async (api, params) => {
    setState((p) => ({ ...p, loadingIndicatorList: true }));
    try {
      const indicatorList = await requestAllIndicators(api, params);  ////Get all Indicators
      setState((p) => ({
        ...p,
        indicatorList: indicatorList.content,
        pageable: indicatorList.pageable,
        totalElements: indicatorList.totalElements,
        loadingIndicatorList: false,
      }));
    } catch (error) {
      console.log("Error requesting all indicators");
      enqueueSnackbar("Failed to load indicators", { variant: "error" });
    } finally {
      setState((p) => ({ ...p, loadingIndicatorList: false }));
    }
  };

  useEffect(() => {
    loadAllIndicatorList(api, state.params);
  }, [state.params]);

  useEffect(() => { // Search functionality runs whenever the user types a new letter in search box
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

  const handlePreview = (id) => { // navigates to preview page of selected indicator
    navigate(`/indicator/pool/${id}`);
  };

  const handlePageChange = (event, newPage) => {// updates sate.params.page when user changes page which triggers useEffect for a new API call
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

  // * Helper functions
  function toSentenceCase(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function changeTimeFormat(time) {
    const date = new Date(time);
    const options = { year: "numeric", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  function handleDisplayType(type) {
    switch (type) {
      case "BASIC":
        return (
          <Chip
            label={toSentenceCase(type)}
            variant="outlined"
            color="success"
            size="small"
          />
        );
      case "COMPOSITE":
        return (
          <Chip
            label={toSentenceCase(type)}
            variant="outlined"
            color="info"
            size="small"
          />
        );
      case "MULTI_LEVEL":
        return (
          <Chip
            label="Multi Level"
            variant="outlined"
            color="warning"
            size="small"
          />
        );
      default:
        return (
          <Chip
            label={toSentenceCase(type)}
            variant="outlined"
            color="default"
            size="small"
          />
        );
    }
  }

  return (// rendering the table with all indicators
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6" component="h2">
          All Indicators ({state.totalElements})
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {!state.toggleSearch && (
            <TextField
              size="small"
              placeholder="Search indicators..."
              value={state.searchTerm}
              onChange={handleSearchTerm}
              autoFocus
            />
          )}
          <IconButton
            onClick={handleToggleSearch}
            color="primary"
            title={state.toggleSearch ? "Search" : "Close search"}
          >
            {state.toggleSearch ? <SearchIcon /> : <CloseIcon />}
          </IconButton>
        </Box>
      </Box>

      {state.loadingIndicatorList && <LinearProgress />}

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="all indicators table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Created On</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {state.filteredIndicatorList.length > 0 ? (
              state.filteredIndicatorList.map((indicator) => (
                <TableRow
                  key={indicator.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  onMouseEnter={() => handleOnHoverIndicator(indicator.id)}
                  onMouseLeave={() => handleOnHoverIndicator(undefined)}
                  hover
                >
                  <TableCell component="th" scope="row">
                    <Typography variant="body2">
                      {indicator.indicatorName}
                    </Typography>
                  </TableCell>
                  <TableCell>{handleDisplayType(indicator.type)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {indicator.createdBy}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {changeTimeFormat(indicator.createdOn)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Preview">
                      <IconButton
                        color="primary"
                        onClick={() => handlePreview(indicator.id)}
                        size="small"
                      >
                        <PreviewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {state.loadingIndicatorList
                      ? "Loading indicators..."
                      : state.searchTerm
                      ? "No indicators found matching your search."
                      : "No indicators available."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={state.totalElements}
        page={state.pageable.pageNumber}
        onPageChange={handlePageChange}
        rowsPerPage={state.pageable.pageSize}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Box>
  );
};

export default AllIndicatorsTable;
