import { IconButton, Grid, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useContext } from "react";
import { ISCContext } from "../../../../indicator-specification-card";

export default function ConfirmGoal() {
  const { requirements, setRequirements } = useContext(ISCContext);

  const handleToggleGoalEdit = () => {
    setRequirements((p) => ({
      ...p,
      edit: { ...p.edit, goal: !p.edit.goal },
      show: { ...p.show, question: true },
    }));
  };

  return (
    <>
      <Grid container spacing={1} sx={{ pb: 4 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid container justifyContent="space-between" alignItems="center">
            <Typography>Your Goal</Typography>
            <IconButton color="primary" onClick={handleToggleGoalEdit}>
              <EditIcon />
            </IconButton>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Typography>
            I want to <b>{requirements.goalType.verb}</b> the{" "}
            <b>{requirements.goal}</b>
          </Typography>
        </Grid>
      </Grid>
    </>
  );
}
