import {
  Box,
  Button,
  Fab,
  IconButton,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import DoneIcon from "@mui/icons-material/Done";
import Grid from "@mui/material/Grid2";
import { useContext, useState } from "react";
import { ISCContext } from "../../../../indicator-specification-card";

export default function FormulateQuestion() {
  const { requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    questionPopoverAnchor: null,
  });

  const handleQuestionPopoverAnchor = (param) => {
    setState((p) => ({ ...p, questionPopoverAnchor: param }));
  };

  const handleFormData = (e) => {
    const { name, value } = e.target;
    setRequirements((p) => ({ ...p, [name]: value }));
  };

  const handleToggleQuestionEdit = () => {
    setRequirements((p) => ({
      ...p,
      edit: { ...p.edit, question: !p.edit.question },
      show: { ...p.show, indicatorName: true },
    }));
  };

  const handleDisabledFabButton = () => {
    return requirements.question.length < 1;
  };

  return (
    <>
      <Grid container justifyContent="center">
        <Grid size={{ xs: 12, md: 8 }}>
          <Grid container spacing={2}>
            <Grid size="grow">
              <Typography variant="body2" gutterBottom>
                Formulate your question
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Grid container alignItems="center" spacing={2}>
                <Grid size="auto">
                  <Tooltip
                    arrow
                    title={<Typography>Click to view some examples</Typography>}
                  >
                    <IconButton
                      size="small"
                      color="warning"
                      onClick={(e) =>
                        handleQuestionPopoverAnchor(e.currentTarget)
                      }
                    >
                      <TipsAndUpdatesIcon />
                    </IconButton>
                    <Popover
                      open={Boolean(state.questionPopoverAnchor)}
                      anchorEl={state.questionPopoverAnchor}
                      onClose={() => handleQuestionPopoverAnchor(null)}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "left",
                      }}
                      PaperProps={{
                        sx: {
                          backgroundColor: "primary.main",
                          color: "primary.contrastText",
                          position: "absolute",
                          p: 1,
                        },
                      }}
                    >
                      <Box sx={{ p: 2, maxWidth: 400 }}>
                        <Typography gutterBottom>
                          <b>Step 1: Clarify your goal</b>
                        </Typography>
                        <Typography>
                          What are you trying to monitor or improve?
                        </Typography>
                        <Typography gutterBottom>
                          Here are some <b>Examples</b> for inspiration:
                        </Typography>
                        <Typography sx={{ my: -1 }}>
                          <ul>
                            <li>
                              I want to <b>assess</b> students’ understanding of
                              course material by analyzing quiz and test results
                              weekly.
                            </li>
                            <li>
                              I want to <b>monitor</b> student engagement by
                              tracking logins, participation in discussions, and
                              time spent on learning activities.
                            </li>
                            <li>
                              I want to <b>intervene</b> early by identifying
                              students at risk of failure using predictive
                              models based on past performance and engagement.
                            </li>
                          </ul>
                        </Typography>
                        <Typography gutterBottom>
                          You can select one of the goals from the list.
                        </Typography>
                        <Typography>
                          You can also create your own goal by typing in this
                          text box and then adding it to the list.
                        </Typography>
                      </Box>
                      <Grid container justifyContent="flex-end">
                        <Button
                          size="small"
                          onClick={() => handleQuestionPopoverAnchor(null)}
                          color="text"
                          variant="outlined"
                        >
                          Close
                        </Button>
                      </Grid>
                    </Popover>
                  </Tooltip>
                </Grid>
                <Grid size={{ xs: 12, sm: "grow" }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size="grow">
                      <TextField
                        fullWidth
                        required
                        name="question"
                        value={requirements.question}
                        label="I am interested in"
                        placeholder="e.g., knowing how often these learning materials are viewed by my students."
                        onChange={handleFormData}
                        error={requirements.question === ""}
                      />
                    </Grid>
                    <Grid size="auto">
                      <Fab
                        color="primary"
                        size="small"
                        onClick={handleToggleQuestionEdit}
                        disabled={handleDisabledFabButton()}
                      >
                        <Tooltip title={<Typography>Confirm</Typography>}>
                          <DoneIcon />
                        </Tooltip>
                      </Fab>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}
