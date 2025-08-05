import { useContext } from "react";
import {
  Autocomplete,
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import DeleteIcon from "@mui/icons-material/Delete";
import { BasicContext } from "../../../../basic-indicator";
import ActivityTypeSelection from "./activity-type-selection";

export default function ActivityFilterCard({ activity, index }) {
  const { filters, setFilters } = useContext(BasicContext);

  const handleRemoveFilter = () => {
    setFilters((p) => {
      const updatedActivities = p.selectedActivities.filter(
        (a) => a.id !== activity.id
      );
      return { ...p, selectedActivities: updatedActivities };
    });
  };

  return (
    <>
      <Paper
        sx={{
          width: 450,
          p: 2,
          flexShrink: 0,
        }}
        variant="outlined"
      >
        <Grid container spacing={2}>
          <Grid size="grow">
            <Grid container justifyContent="space-between" alignItems="center">
              <Typography>Filter {index + 1}</Typography>
              <IconButton
                size="small"
                color="error"
                onClick={handleRemoveFilter}
              >
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ActivityTypeSelection activity={activity} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography gutterBottom>Action on activities</Typography>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
}
