import { useContext } from "react";
import { IconButton, Grid, Typography, Avatar, Divider } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import { ISCContext } from "../../../../indicator-specification-card";

export default function ConfirmQuestion() {
  const { requirements, setRequirements } = useContext(ISCContext);

  const handleToggleQuestionEdit = () => {
    setRequirements((p) => ({
      ...p,
      edit: { ...p.edit, question: !p.edit.question },
      show: { ...p.show, indicatorName: true },
    }));
  };

  return (
    <Grid container spacing={2}>
      <Grid size="auto">
        <Grid
          direction="column"
          container
          alignItems="center"
          sx={{ height: "100%" }}
          spacing={1}
        >
          <Avatar sx={{ bgcolor: "primary.main" }}>
            <QuestionMarkIcon />
          </Avatar>
          {requirements.show.question && (
            <Grid size="grow">
              <Divider orientation="vertical" sx={{ borderRightWidth: 2 }} />
            </Grid>
          )}
        </Grid>
      </Grid>
      <Grid size="grow" sx={{ pb: 2 }}>
        <Grid container direction="column" spacing={1}>
          <Grid container justifyContent="space-between" alignItems="center">
            <Typography>Your Question</Typography>
            <IconButton color="primary" onClick={handleToggleQuestionEdit}>
              <EditIcon />
            </IconButton>
          </Grid>
          <Typography>
            I am interested in knowing <b>{requirements.question}</b>
          </Typography>
        </Grid>
      </Grid>
    </Grid>
  );
}
