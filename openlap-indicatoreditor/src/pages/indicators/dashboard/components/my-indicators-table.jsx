import { useContext, useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import {
  requestIndicatorCode,
  requestIndicatorDeletion,
  requestIndicatorFullDetail,
  requestMyIndicators,
} from "../utils/indicator-dashboard-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";

import SearchIcon from "@mui/icons-material/Search";
import PreviewIcon from "@mui/icons-material/Preview";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CodeIcon from "@mui/icons-material/Code";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useLocation, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { handleDisplayType } from "../utils/utils.js";
import DeleteDialog from "../../../../common/components/delete-dialog/delete-dialog.jsx";

const MyIndicatorsTable = () => {
  const { api, SESSION_INDICATOR } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
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
    copyCode: {
      loading: false,
      code: "",
    },
    openDeleteDialog: false,
    loadingIndicators: false,
    onHoverIndicatorId: undefined,
    toggleSearch: true,
    searchTerm: "",
    filteredIndicatorList: [],
  });

  useEffect(() => {
    const loadMyIndicators = async (api, params) => {
      try {
        return await requestMyIndicators(api, params);
      } catch (error) {
        console.log("Error requesting my indicators");
      }
    };
    setState((p) => ({ ...p, loadingIndicators: true }));
    loadMyIndicators(api, state.params).then((indicators) => {
      setState((p) => ({
        ...p,
        indicatorList: indicators.content,
        pageable: indicators.pageable,
        totalElements: indicators.totalElements,
        loadingIndicators: false,
      }));
    });
  }, [api, state.params, location]);

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
    console.log("Embed copy code", state.onHoverIndicatorId);
    setState((p) => ({ ...p, copyCode: { ...p.copyCode, loading: true } }));
    try {
      const indicatorCode = await requestIndicatorCode(
        api,
        state.onHoverIndicatorId
      );
      await navigator.clipboard.writeText(indicatorCode.data);
      enqueueSnackbar(indicatorCode.message, { variant: "success" });
      setState((p) => ({
        ...p,
        copyCode: { code: indicatorCode.data, loading: false },
      }));
    } catch (error) {
      setState((p) => ({ ...p, copyCode: { ...p.copyCode, loading: false } }));
      enqueueSnackbar(error.response.data.message, { variant: "error" });
      console.error("Error requesting my indicators", error);
    }
  };

  const handlePreview = (id) => {
    navigate(`/indicator/${id}`);
  };

  const handleEditIndicator = async () => {
    try {
      const indicator = await requestIndicatorFullDetail(
        api,
        state.onHoverIndicatorId
      );
      sessionStorage.setItem(SESSION_INDICATOR, indicator.configuration);
      // navigate("")
      switch (indicator.type) {
        case "BASIC":
          navigate("/indicator/editor/basic");
          break;
        case "COMPOSITE":
          navigate("/indicator/editor/composite");
          break;
        case "MULTI_LEVEL":
          navigate("/indicator/editor/multi-level-analysis");
          break;
        default:
          route = "Unknown";
      }
    } catch (error) {
      console.log("Error requesting my indicators");
    }
  };

  const handleDuplicateIndicator = () => {
    console.log("Duplicate Indicator", state.onHoverIndicatorId);
  };

  const handleToggleDelete = () => {
    setState((p) => ({ ...p, openDeleteDialog: !p.openDeleteDialog }));
  };

  const handleDeleteIndicator = async () => {
    console.log("Delete Indicator", state.onHoverIndicatorId);
    try {
      await requestIndicatorDeletion(api, state.onHoverIndicatorId);
      setState((p) => ({
        ...p,
        indicatorList: p.indicatorList.filter(
          (item) => item.id !== state.onHoverIndicatorId
        ),
      }));
      enqueueSnackbar("Indicator deleted successfully", { variant: "success" });
    } catch (error) {
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
    setState((p) => ({ ...p, toggleSearch: !p.toggleSearch }));
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
    return new Date(time).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // const handleDeleteIndicator = (callback) => {
  //   const deleteIndicator = async (api, indicatorId) => {
  //     try {
  //       return await requestIndicatorDeletion(api, indicatorId);
  //     } catch (error) {
  //       enqueueSnackbar(error.message, { variant: "error" });
  //     }
  //   };
  //   if (selectedIndicator !== null) {
  //     deleteIndicator(api, selectedIndicator.id).then((response) => {
  //       enqueueSnackbar(response.message, { variant: "success" });
  //       setState((prevState) => ({
  //         ...prevState,
  //         myIndicators: prevState.myIndicators.filter(
  //           (indicator) => indicator.id !== selectedIndicator.id
  //         ),
  //       }));
  //       callback();
  //     });
  //     handleMenuClose();
  //   }
  // };

  return (
    <>
      <Grid container spacing={2}>
        <Grid size={12}>
          <TableContainer component={Paper} elevation={0} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  {/* // TODO: For the future: multi select delete */}
                  {/* <TableCell padding="checkbox" sx={{ width: 30 }}>
                    <Checkbox
                      checked={selected.length === emails.length}
                      indeterminate={
                        selected.length > 0 && selected.length < emails.length
                      }
                      onChange={(e) => {
                        setSelected(
                          e.target.checked ? emails.map((e) => e.id) : []
                        );
                      }}
                    />
                  </TableCell> */}
                  <TableCell>
                    <Grid container alignItems="center" spacing={1}>
                      {state.toggleSearch ? (
                        <>
                          <Typography>Indicator name</Typography>
                          <Tooltip
                            title={
                              <Typography>Search for indicator</Typography>
                            }
                          >
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={handleToggleSearch}
                            >
                              <SearchIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Grid size="auto">
                            <Tooltip
                              title={<Typography>Close search</Typography>}
                            >
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={handleToggleSearch}
                              >
                                <CloseIcon />
                              </IconButton>
                            </Tooltip>
                          </Grid>
                          <Grid size="grow">
                            <TextField
                              size="small"
                              placeholder="Search for indicator"
                              value={state.searchTerm}
                              onChange={handleSearchTerm}
                            />
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </TableCell>
                  <TableCell align="right" sx={{ width: 180 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.filteredIndicatorList.map((indicator) => (
                  <TableRow
                    key={indicator.id}
                    // selected={selected.includes(indicator.id)}
                    onMouseEnter={() => handleOnHoverIndicator(indicator.id)}
                    hover
                    sx={{
                      cursor: "pointer",
                      position: "relative",
                      "&:hover .hover-actions": { opacity: 1 },
                      "&:hover .time-text": { opacity: 0 },
                    }}
                  >
                    {/* // TODO: For the future: multi select delete */}
                    {/* <TableCell padding="checkbox" sx={{ width: 40 }}>
                      <Checkbox
                        checked={selected.includes(indicator.id)}
                        onChange={() => handleSelect(indicator.id)}
                      />
                    </TableCell> */}

                    <TableCell onClick={() => handlePreview(indicator.id)}>
                      <Typography component="span" fontWeight="bold">
                        {toSentenceCase(indicator.indicatorName)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        className="time-text"
                        sx={{
                          transition: "opacity 0.2s ease-in-out",
                          textAlign: "right",
                        }}
                      >
                        {changeTimeFormat(indicator.createdOn)}
                      </Typography>

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
                        {state.copyCode.loading ? (
                          <CircularProgress size="2rem" />
                        ) : (
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
                                  iFrame code snippet you can embed in any web
                                  application that supports iFrames.
                                  <br />
                                  It lets you display real-time analytics
                                  directly within your website.
                                </Typography>
                              </>
                            }
                          >
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={handleCopyEmbedCode}
                            >
                              <CodeIcon />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip
                          arrow
                          title={<Typography>Preview indicator</Typography>}
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handlePreview(indicator.id)}
                          >
                            <PreviewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          arrow
                          title={<Typography>Edit indicator</Typography>}
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditIndicator(indicator.id)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          arrow
                          title={<Typography>Duplicate indicator</Typography>}
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditIndicator(indicator.id)}
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </Tooltip>
                        <Divider
                          orientation="vertical"
                          flexItem
                          sx={{ mx: 1 }}
                        />
                        <Tooltip
                          arrow
                          title={<Typography>Delete indicator</Typography>}
                        >
                          <IconButton
                            size="small"
                            color="error"
                            onClick={handleToggleDelete}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
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
              rowsPerPageOptions={[5, 10, 20, 50]}
            />
          </TableContainer>
        </Grid>
      </Grid>

      <DeleteDialog
        open={state.openDeleteDialog}
        toggleOpen={handleToggleDelete}
        message={
          <Typography>
            This will delete the indicator permanently from your dashboard.
          </Typography>
        }
        handleDelete={handleDeleteIndicator}
      />
    </>
  );
};

export default MyIndicatorsTable;
