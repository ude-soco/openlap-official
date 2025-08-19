import React, { useContext, useEffect, useState } from "react";
import Grid from "@mui/material/Grid2";
import SearchIcon from "@mui/icons-material/Search";
import { requestAllMyIndicatorsWithCode } from "../utils/indicators-api";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { useSnackbar } from "notistack";
import { CompositeContext } from "../../../composite-indicator";
import { Button, Paper, Skeleton, TextField, Typography } from "@mui/material";
import ChartPreview from "../../../../components/chart-preview";
import { handleDisplayType } from "../../../../../dashboard/utils/utils";

const IndicatorSelection = () => {
  const { api } = useContext(AuthContext);
  const { indicator, setIndicator } = useContext(CompositeContext);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (indicator.myIndicators.list.content.length === 0) {
      loadMyIndicatorList();
    }
  }, []);

  const loadMyIndicatorList = async () => {
    try {
      const myIndicatorList = await requestAllMyIndicatorsWithCode(
        api,
        indicator.myIndicators.params
      );
      setIndicator((p) => ({
        ...p,
        myIndicators: { ...p.myIndicators, list: myIndicatorList },
      }));
    } catch (error) {
      enqueueSnackbar("Error getting indicators", { variant: "error" });
      console.log(error);
    }
  };

  const handleSelectIndicator = (indicator) => {
    setIndicator((p) => ({
      ...p,
      selectedIndicators: [...p.selectedIndicators, indicator],
    }));
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
    <Grid container spacing={1}>
      <Typography>Select indicators to combine</Typography>
      <TextField
        autoFocus
        fullWidth
        size="small"
        placeholder="Search for indicators"
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: "action.active" }} />,
        }}
      />
      <Grid size={{ xs: 12 }}>
        <Grid
          container
          spacing={2}
          sx={{ overflowX: "auto", flexWrap: "nowrap", pb: 2 }}
        >
          {indicator.myIndicators.list.content.length === 0
            ? Array.from({ length: 2 }).map((_, index) => (
                <Grid
                  size={{ xs: 12, lg: 6 }}
                  key={index}
                  sx={{ display: "flex", alignItems: "stretch" }}
                >
                  <Skeleton variant="rectangle" height={300} width="100%" />
                </Grid>
              ))
            : indicator.myIndicators.list.content.map((indicator, index) => (
                <Grid size="auto" key={indicator.id}>
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
                      onClick={() => handleSelectIndicator(indicator)}
                    >
                      Select
                    </Button>
                  </Grid>
                </Grid>
              ))}
        </Grid>
      </Grid>
    </Grid>
  );
};

export default IndicatorSelection;
