import { useContext } from "react";
import { IconButton, Grid, Typography, Divider, Avatar } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import FlagIcon from "@mui/icons-material/Flag";
import { ISCContext } from "../../../../isc-context.js";

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
    <Grid container spacing={2}>
      <Grid size="auto">
        <Grid
          container
          sx={{ alignItems: "center", flexDirection: "column", height: "100%" }}
          spacing={1}
        >
          <Avatar sx={{ bgcolor: "primary.main" }}>
            <FlagIcon />
          </Avatar>
          {requirements.show.question && (
            <Grid size="grow">
              <Divider orientation="vertical" sx={{ borderRightWidth: 2 }} />
            </Grid>
          )}
        </Grid>
      </Grid>
      <Grid size="grow" sx={{ pb: 2 }}>
        <Grid container sx={{ flexDirection: "column" }} spacing={1}>
          <Grid container sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography>Your goal</Typography>
            <IconButton color="primary" onClick={handleToggleGoalEdit}>
              <EditIcon />
            </IconButton>
          </Grid>
          <Typography>
            I want to <b>{requirements.goalType.verb}</b> the{" "}
            <b>{requirements.goal}</b>
          </Typography>
        </Grid>
      </Grid>
    </Grid>
  );
}
