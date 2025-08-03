import { Tooltip, Typography } from "@mui/material";
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
      <Grid container justifyContent="center">
        <Grid size={{ xs: 12, md: 8 }}>
          <Tooltip
            arrow
            title={<Typography>Edit question</Typography>}
            placement="right"
          >
            <Grid
              container
              spacing={2}
              alignItems="center"
              onClick={handleToggleQuestionEdit}
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
                  <i>Your question:</i> I am interested in{" "}
                  <b>{requirements.question}</b>
                </Typography>
              </Grid>
              <Grid size="auto">
                <EditIcon color="primary" />
              </Grid>
            </Grid>
          </Tooltip>
        </Grid>
      </Grid>
    </>
  );
}
