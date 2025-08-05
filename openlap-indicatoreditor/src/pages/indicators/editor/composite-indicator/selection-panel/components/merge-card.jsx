import React from "react";
import { Divider, Grid, Paper, Typography } from "@mui/material";
import AnalyzedDataTable from "../../../components/analyzed-data-table/analyzed-data-table.jsx";

const MergeCard = ({ indicator }) => {
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
            <AnalyzedDataTable
              analyzedData={indicator.analyzedDataset.columns}
            />
          </Grid>
        </Grid>
      </Paper>
    </>
  );
};

export default MergeCard;
