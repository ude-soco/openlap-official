import React, { useContext } from "react";
import {
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AnalyzedDataTable from "../../../../components/analyzed-data-table/analyzed-data-table.jsx";
import { MultiLevelAnalysisIndicatorContext } from "../../../multi-level-analysis-indicator.jsx";

const MergeCard = ({ indicator, columnsToMerge, analyzedData }) => {
  const { indicatorRef, setIndicatorRef } = useContext(
    MultiLevelAnalysisIndicatorContext,
  );
  const handleSelectColumnToMerge = (event) => {
    const selectedColumn = columnsToMerge.find(
      (column) => column.id === event.target.value,
    );
    const updatedIndicators = indicatorRef.indicators.map((ind) => {
      if (ind.indicatorId === indicator.indicatorId) {
        return {
          ...ind,
          columnToMerge: selectedColumn,
        };
      }
      return ind;
    });

    setIndicatorRef((prevState) => ({
      ...prevState,
      indicators: updatedIndicators,
    }));
  };

  return (
    <>
      <Paper variant="outlined" sx={{ flex: 1, p: 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Typography>{indicator.name}</Typography>
          </Grid>
          <Grid item xs={12} sx={{ pb: 1 }}>
            <Divider />
          </Grid>
          <Grid item xs={12}>
            <Grid container spacing={1}>
              {columnsToMerge.length > 0 && (
                <>
                  <Grid item xs={12}>
                    <Typography
                      sx={{
                        fontWeight:
                          columnsToMerge.length === 1 ? undefined : "bold",
                      }}
                    >
                      Select a column to merge
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl>
                      <RadioGroup
                        row
                        aria-labelledby="radio-buttons-group-role-label"
                        name="role"
                        defaultValue={
                          columnsToMerge.length === 1
                            ? columnsToMerge[0].id
                            : undefined
                        }
                        onChange={handleSelectColumnToMerge}
                      >
                        {columnsToMerge.map((column) => (
                          <>
                            <FormControlLabel
                              key={column.id}
                              value={column.id}
                              control={<Radio />}
                              label={
                                <Grid container spacing={1} alignItems="center">
                                  <Grid item>
                                    <Typography>{column.title}</Typography>
                                  </Grid>
                                  {columnsToMerge.length === 1 && (
                                    <Grid item>
                                      <Tooltip
                                        title={
                                          <Typography
                                            variant="body2"
                                            align="center"
                                          >
                                            There is only one compatible column
                                            available to merge
                                          </Typography>
                                        }
                                      >
                                        <Chip label="Preselected" />
                                      </Tooltip>
                                    </Grid>
                                  )}
                                </Grid>
                              }
                            />
                          </>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                </>
              )}
              <Grid item xs={12}>
                <AnalyzedDataTable analyzedData={analyzedData} />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
};

export default MergeCard;
