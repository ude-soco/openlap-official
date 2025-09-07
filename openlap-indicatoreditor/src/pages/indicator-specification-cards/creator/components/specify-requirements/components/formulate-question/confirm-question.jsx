import { IconButton, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import EditIcon from "@mui/icons-material/Edit";
import { useContext } from "react";
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
    <>
      <Grid container spacing={1} sx={{ pb: 4 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid container justifyContent="space-between" alignItems="center">
            <Typography>Your Question</Typography>
            <IconButton color="primary" onClick={handleToggleQuestionEdit}>
              <EditIcon />
            </IconButton>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Typography>
            I am interested in <b>{requirements.question}</b>
          </Typography>
        </Grid>
      </Grid>
    </>
  );
}
