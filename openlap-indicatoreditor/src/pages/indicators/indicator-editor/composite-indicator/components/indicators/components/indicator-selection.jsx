import { useContext, useEffect, useState } from "react";
import Grid from "@mui/material/Grid2";
import SearchIcon from "@mui/icons-material/Search";
import CheckIcon from "@mui/icons-material/Check";
import { requestAllMyIndicatorsWithCode } from "../utils/indicators-api";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { useSnackbar } from "notistack";
import { CompositeContext } from "../../../composite-indicator";
import {
  Button,
  CircularProgress,
  Pagination,
  Paper,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import ChartPreview from "../../../../components/chart-preview";
import { handleDisplayType } from "../../../../../dashboard/utils/utils";
import { useNavigate } from "react-router-dom";

const IndicatorSelection = () => {
  const { api } = useContext(AuthContext);
  const { indicator, setIndicator } = useContext(CompositeContext);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [state, setState] = useState({
    searchText: indicator.myIndicators.params.searchText,
    isLoadingMyIndicators: false,
  });

  useEffect(() => {
    if (indicator.myIndicators.list.content.length === 0) {
      loadMyIndicatorList(indicator.myIndicators.params);
    }
  }, []);

  const loadMyIndicatorList = async (params) => {
    setState((p) => ({ ...p, isLoadingMyIndicators: true }));
    try {
      const myIndicatorList = await requestAllMyIndicatorsWithCode(api, params);
      setIndicator((p) => ({
        ...p,
        myIndicators: { ...p.myIndicators, list: myIndicatorList },
      }));
    } catch (error) {
      enqueueSnackbar("Error getting indicators", { variant: "error" });
      console.log(error);
    } finally {
      setState((p) => ({ ...p, isLoadingMyIndicators: false }));
    }
  };

  const handleToggleSelectIndicator = (indicator) => {
    if (isSelected(indicator.id)) {
      setIndicator((p) => ({
        ...p,
        selectedIndicators: p.selectedIndicators.filter(
          (selected) => selected.id !== indicator.id
        ),
      }));
      return;
    }
    setIndicator((p) => ({
      ...p,
      selectedIndicators: [...p.selectedIndicators, indicator],
    }));
  };

  const isSelected = (indicatorId) => {
    return indicator.selectedIndicators.some(
      (selected) => selected.id === indicatorId
    );
  };

  const handleCreateNew = () => {
    navigate("/indicator/editor/basic");
  };

  const handleSearchText = (e) => {
    const searchText = e.target.value;
    setState((p) => ({ ...p, searchText }));
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    const timeout = setTimeout(() => {
      setIndicator((p) => ({
        ...p,
        myIndicators: {
          ...p.myIndicators,
          list: { ...p.myIndicators.list, content: [] },
        },
      }));
      let params = { page: 0, searchText: searchText };
      loadMyIndicatorList(params);
    }, 1000);
    setTypingTimeout(timeout);
  };

  const handlePagination = (event, value) => {
    console.log("pagination");
    setIndicator((p) => ({
      ...p,
      myIndicators: {
        ...p.myIndicators,
        list: { ...p.myIndicators.list, content: [] },
      },
    }));
    let params = { page: value - 1, searchText: state.searchText };
    loadMyIndicatorList(params);
  };

  // * Helper function
  function changeTimeFormat(time) {
    return new Date(time).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Typography gutterBottom>Select indicators to combine</Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Search for indicators"
          value={state.searchText}
          onChange={handleSearchText}
          InputProps={{
            startAdornment:
              state.isLoadingMyIndicators && state.searchText.length !== 0 ? (
                <CircularProgress size={24} sx={{ mr: 1 }} />
              ) : (
                <SearchIcon sx={{ mr: 1, color: "action.active" }} />
              ),
          }}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Grid container>
          {state.isLoadingMyIndicators &&
            Array.from({ length: 2 }).map((_, index) => (
              <Grid size={{ xs: 12, lg: 6 }} key={index}>
                <Skeleton variant="rectangle" height={550} width="100%" />
              </Grid>
            ))}
        </Grid>
      </Grid>
      <Grid size={{ xs: 12 }}>
        {!state.isLoadingMyIndicators &&
          indicator.myIndicators.list.content.length === 0 && (
            <Grid
              container
              direction="column"
              alignItems="center"
              sx={{ py: 14 }}
            >
              <Typography
                variant="body1"
                gutterBottom
                align="center"
                color="textSecondary"
              >
                No Basic Indicators {state.searchText ? "found" : "created yet"}
                . Click "Create new" to get started.
              </Typography>
              <Button variant="contained" onClick={handleCreateNew}>
                Create New
              </Button>
            </Grid>
          )}
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Grid
          container
          spacing={2}
          sx={{
            pb: 2,
            flexWrap: "nowrap",
            overflowX: "auto",
          }}
        >
          {!indicator.myIndicators.previewModal.isPreviewModalOpen &&
            indicator.myIndicators.list.content.map((indicator) => (
              <Grid size="auto" key={indicator.id} sx={{ flexShrink: 0 }}>
                <Grid
                  container
                  component={Paper}
                  variant="outlined"
                  direction="column"
                  spacing={2}
                  sx={{ p: 3 }}
                >
                  <Grid container direction="column" spacing={0}>
                    <Typography variant="h6">{indicator.name}</Typography>
                    <Typography variant="body2">
                      {handleDisplayType(indicator.type)} ● Created on:{" "}
                      {changeTimeFormat(indicator.createdOn)} ● Created by:{" "}
                      {indicator.createdBy}
                    </Typography>
                  </Grid>
                  <ChartPreview previewData={indicator.previewData} />
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={isSelected(indicator.id) && <CheckIcon />}
                    color={isSelected(indicator.id) ? "success" : "primary"}
                    onClick={() => handleToggleSelectIndicator(indicator)}
                  >
                    {isSelected(indicator.id) ? "Selected" : "Select"}
                  </Button>
                </Grid>
              </Grid>
            ))}
        </Grid>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Grid container justifyContent="center">
          <Pagination
            count={indicator.myIndicators.list.totalPages}
            color="primary"
            onChange={handlePagination}
          />
        </Grid>
      </Grid>
    </Grid>
  );
};

export default IndicatorSelection;
