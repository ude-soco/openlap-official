import { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PreviewIcon from "@mui/icons-material/Preview";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { useLocation, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import { requestISCDetails, requestMyISCs } from "../utils/dashboard-api";
import DeleteDialog from "../../../../common/components/delete-dialog/delete-dialog";

export default function MyIscTable() {
  // const [selected, setSelected] = useState([]);
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
    onHoverIndicatorId: undefined,
    toggleSearch: true,
  });

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

  // const handleSelect = (id) => {
  //   setSelected((prev) =>
  //     prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
  //   );
  // };

  const handleOnHoverIndicator = (id) => {
    setState((p) => ({ ...p, onHoverIndicatorId: id }));
  };

  const handlePreview = (id) => {
    navigate(`/isc/${id}`);
  };

  const handleEditIndicator = (id) => {
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
    loadISCDetail(api, id)
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

  const handleToggleDelete = () => {
    setState((prevState) => ({
      ...prevState,
      openDeleteDialog: !prevState.openDeleteDialog,
    }));
  };

  const handleDeleteIndicator = async () => {
    await requestDeleteISC(api, state.onHoverIndicatorId)
      .then(() => {
        setState((prevState) => ({
          ...prevState,
          myISCList: prevState.myISCList.filter(
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
    setState((prevState) => ({
      ...prevState,
      params: {
        ...prevState.params,
        page: newPage,
      },
    }));
  };

  // * Handle rows per page change
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

  const handleToggleSearch = () => {
    setState((p) => ({
      ...p,
      toggleSearch: !p.toggleSearch,
    }));
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
                {state.myISCList.map((indicator) => (
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
                            onClick={() => handleToggleDelete(indicator.id)}
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
}
