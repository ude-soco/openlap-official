import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Grid,
  Select,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  fetchPublicIndicators,
  fetchPublicIndicatorCode,
} from "../utils/public-indicators-api.js";
import SearchIcon from "@mui/icons-material/Search";
import PreviewIcon from "@mui/icons-material/Preview";
import CloseIcon from "@mui/icons-material/Close";
import CodeIcon from "@mui/icons-material/Code";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import FilterListIcon from "@mui/icons-material/FilterList";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";

const PublicIndicatorsTable = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  
  // Capture URL parameters
  const urlPlatform = searchParams.get("platform");
  const urlUserId = searchParams.get("userId");
  const urlLrsId = searchParams.get("lrsId");

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
      platform: urlPlatform || "",
    },
    filters: {
      platform: {
        CourseMapper: urlPlatform === "CourseMapper",
        Moodle: urlPlatform === "Moodle",
      },
      indicatorType: {
        BASIC: false,
        COMPOSITE: false,
        MULTI_LEVEL: false,
      },
    },
    isLoading: { status: false, indicator: undefined },
    loadingIndicatorList: false,
    onHoverIndicatorId: undefined,
    toggleSearch: true,
    searchTerm: "",
    filteredIndicatorList: [],
    error: null,
  });

  // Store metadata in sessionStorage
  useEffect(() => {
    if (urlUserId) {
      sessionStorage.setItem("externalUserId", urlUserId);
    }
    if (urlLrsId) {
      sessionStorage.setItem("externalLrsId", urlLrsId);
    }
    if (urlPlatform) {
      sessionStorage.setItem("externalPlatform", urlPlatform);
    }
  }, [urlUserId, urlLrsId, urlPlatform]);

  const loadPublicIndicatorList = async (params) => {
    setState((p) => ({ ...p, loadingIndicatorList: true, error: null }));
    try {
      const indicatorList = await fetchPublicIndicators(params);
      
      // Mark indicators as "MY INDICATOR" if created by URL userId or logged-in user
      const enrichedList = (indicatorList.content || []).map((indicator) => {
        const isMyIndicator =
          (urlUserId && indicator.createdBy === urlUserId) ||
          (user?.email && indicator.createdBy === user.email) ||
          (user?.id && indicator.createdById === user.id);
        
        return {
          ...indicator,
          isMyIndicator,
        };
      });
      
      setState((p) => ({
        ...p,
        indicatorList: enrichedList,
        pageable: indicatorList.pageable || { pageSize: 10, pageNumber: 0 },
        totalElements: indicatorList.totalElements || 0,
        loadingIndicatorList: false,
      }));
    } catch (error) {
      console.error("Error requesting public indicators", error);
      setState((p) => ({ 
        ...p, 
        loadingIndicatorList: false,
        error: "Failed to load indicators. Please try again later."
      }));
    }
  };

  useEffect(() => {
    loadPublicIndicatorList(state.params);
  }, [state.params]);

  useEffect(() => {
    let filtered = state.indicatorList;

    // Apply search filter
    if (state.searchTerm) {
      filtered = filtered.filter((indicator) =>
        indicator.indicatorName
          .toLowerCase()
          .includes(state.searchTerm.toLowerCase())
      );
    }

    // Apply platform filter
    const selectedPlatforms = Object.keys(state.filters.platform).filter(
      (key) => state.filters.platform[key]
    );
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter((indicator) =>
        selectedPlatforms.some(
          (platform) => indicator.platform === platform
        )
      );
    }

    // Apply indicator type filter
    const selectedTypes = Object.keys(state.filters.indicatorType).filter(
      (key) => state.filters.indicatorType[key]
    );
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((indicator) =>
        selectedTypes.includes(indicator.type)
      );
    }

    setState((p) => ({ ...p, filteredIndicatorList: filtered }));
  }, [state.searchTerm, state.indicatorList, state.filters]);

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
      const response = await fetchPublicIndicatorCode(state.onHoverIndicatorId);
      await navigator.clipboard.writeText(response.data);
      enqueueSnackbar(response.message || "Code copied to clipboard!", { variant: "success" });
    } catch (error) {
      console.error("Error copying indicator code", error);
      enqueueSnackbar("Failed to copy indicator code", { variant: "error" });
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
    // Navigate to public preview page
    navigate(`/indicators/overview/${id}`);
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

  const handlePlatformFilterChange = (platform) => {
    setState((p) => ({
      ...p,
      filters: {
        ...p.filters,
        platform: {
          ...p.filters.platform,
          [platform]: !p.filters.platform[platform],
        },
      },
    }));
  };

  const handleTypeFilterChange = (type) => {
    setState((p) => ({
      ...p,
      filters: {
        ...p.filters,
        indicatorType: {
          ...p.filters.indicatorType,
          [type]: !p.filters.indicatorType[type],
        },
      },
    }));
  };

  const handleClearFilters = () => {
    setState((p) => ({
      ...p,
      filters: {
        platform: {
          CourseMapper: false,
          Moodle: false,
        },
        indicatorType: {
          BASIC: false,
          COMPOSITE: false,
          MULTI_LEVEL: false,
        },
      },
      searchTerm: "",
    }));
  };

  // Helper functions
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

  function handleDisplayType(type) {
    switch (type) {
      case "BASIC":
        return "Basic";
      case "COMPOSITE":
        return "Composite";
      case "MULTI_LEVEL":
        return "Multi Level";
      default:
        return type;
    }
  }

  return (
    <Grid container spacing={2}>
      {/* Filter Sidebar */}
      <Grid size={{ xs: 12, md: 3 }}>
        <Paper sx={{ p: 2, position: "sticky", top: 80 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <FilterListIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Filters</Typography>
          </Box>

          {/* Platform Filter */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Platform</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={state.filters.platform.CourseMapper}
                      onChange={() => handlePlatformFilterChange("CourseMapper")}
                    />
                  }
                  label="CourseMapper"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={state.filters.platform.Moodle}
                      onChange={() => handlePlatformFilterChange("Moodle")}
                    />
                  }
                  label="Moodle"
                />
              </FormGroup>
            </AccordionDetails>
          </Accordion>

          {/* Indicator Type Filter */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Indicator Type</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={state.filters.indicatorType.BASIC}
                      onChange={() => handleTypeFilterChange("BASIC")}
                    />
                  }
                  label="Basic"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={state.filters.indicatorType.COMPOSITE}
                      onChange={() => handleTypeFilterChange("COMPOSITE")}
                    />
                  }
                  label="Composite"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={state.filters.indicatorType.MULTI_LEVEL}
                      onChange={() => handleTypeFilterChange("MULTI_LEVEL")}
                    />
                  }
                  label="Multi-Level"
                />
              </FormGroup>
            </AccordionDetails>
          </Accordion>

          <Button
            fullWidth
            variant="outlined"
            onClick={handleClearFilters}
            sx={{ mt: 2 }}
          >
            Clear Filters
          </Button>
        </Paper>
      </Grid>

      {/* Main Content */}
      <Grid size={{ xs: 12, md: 9 }}>
        <TableContainer component={Paper} elevation={0} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Grid container alignItems="center" spacing={1}>
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
                      backgroundColor: indicator.isMyIndicator 
                        ? "rgba(25, 118, 210, 0.05)" 
                        : "inherit",
                      borderLeft: indicator.isMyIndicator 
                        ? "4px solid #1976d2" 
                        : "4px solid transparent",
                    }}
                  >
                    <TableCell onClick={() => handlePreview(indicator.id)}>
                      <Grid container justifyContent="space-between">
                        <Grid size="grow">
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Typography component="span">
                              <b>{toSentenceCase(indicator.indicatorName)}</b>
                            </Typography>
                            {indicator.isMyIndicator && (
                              <Chip
                                icon={<BookmarkIcon />}
                                label="MY INDICATOR"
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: "bold" }}
                              />
                            )}
                          </Box>
                          <Typography component="span" variant="caption">
                            {handleDisplayType(indicator.type)} ● Created
                            on: {changeTimeFormat(indicator.createdOn)} ● Created by: {indicator.createdBy}
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
                                    iFrame code snippet you can embed in any web
                                    application that supports iFrames.
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
              {state.loadingIndicatorList && (
                <TableRow>
                  <TableCell colSpan={3} sx={{ padding: 0 }}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              )}
              {state.error && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1 }}>
                      <Typography color="error.dark">{state.error}</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {state.filteredIndicatorList.length === 0 &&
                !state.loadingIndicatorList &&
                !state.error && (
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
                              No indicators available.
                            </Typography>
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
  );
};

export default PublicIndicatorsTable;
