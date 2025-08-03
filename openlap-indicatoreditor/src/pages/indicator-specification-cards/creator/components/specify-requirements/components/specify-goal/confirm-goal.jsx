import { Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
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
      <Grid container justifyContent="center">
        <Grid size={{ xs: 12, md: 8 }}>
          <Tooltip
            arrow
            title={<Typography>Edit goal</Typography>}
            placement="right"
          >
            <Grid
              container
              spacing={2}
              alignItems="center"
              onClick={handleToggleGoalEdit}
              sx={{
                p: 0.5,
                "&:hover": {
                  cursor: "pointer",
                  backgroundColor: "rgba(0, 0, 0, 0.03)",
                },
              }}
            >
              <Grid size="grow">
                <Typography>
                  <i>Your goal:</i> I want to{" "}
                  <b>{requirements.goalType.verb}</b> the{" "}
                  <b>{requirements.goal}</b>
                </Typography>
              </Grid>
              <Grid size="auto">
                <EditIcon size="small" color="primary" />
              </Grid>
            </Grid>
          </Tooltip>
        </Grid>
      </Grid>
    </>
  );
}
