import { useContext, useState } from "react";
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
import Grid from "@mui/material/Grid2";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import DoneIcon from "@mui/icons-material/Done";

import GoalList from "./goal-list";
import { ISCContext } from "../../../../indicator-specification-card";

export default function SpecifyGoal() {
  const { requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    goalPopoverAnchor: null,
  });

  const handleGoalPopoverAnchor = (param) => {
    setState((p) => ({ ...p, goalPopoverAnchor: param }));
  };

  const handleFormData = (e) => {
    const { name, value } = e.target;
    setRequirements((p) => ({ ...p, [name]: value }));
  };

  const handleToggleGoalEdit = () => {
    setRequirements((p) => ({
      ...p,
      edit: { ...p.edit, goal: !p.edit.goal },
      show: { ...p.show, question: true },
    }));
  };

  const handleDisabledFabButton = () => {
    return (
      requirements.goal.length < 1 || requirements.goalType.verb.length < 1
    );
  };

  return (
    <>
      <Grid container justifyContent="center">
        <Grid size={{ xs: 12, md: 8 }}>
          <Grid container spacing={1}>
            <Grid size="grow">
              <Typography variant="body2" gutterBottom>
                Specify your goal
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Grid container alignItems="center" spacing={1}>
                <Grid size="auto">
                  <Tooltip
                    arrow
                    title={<Typography>Click to view some examples</Typography>}
                  >
                    <IconButton
                      size="small"
                      color="warning"
                      onClick={(e) => handleGoalPopoverAnchor(e.currentTarget)}
                    >
                      <TipsAndUpdatesIcon />
                    </IconButton>
                  </Tooltip>
                  <Popover
                    open={Boolean(state.goalPopoverAnchor)}
                    anchorEl={state.goalPopoverAnchor}
                    onClose={() => handleGoalPopoverAnchor(null)}
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
                            students at risk of failure using predictive models
                            based on past performance and engagement.
                          </li>
                        </ul>
                      </Typography>
                      <Typography gutterBottom>
                        You can select one of the goals from the list.
                      </Typography>
                      <Typography>
                        You can also create your own goal by typing in this text
                        box and then adding it to the list.
                      </Typography>
                    </Box>
                    <Grid container justifyContent="flex-end">
                      <Button
                        size="small"
                        onClick={() => handleGoalPopoverAnchor(null)}
                        color="text"
                        variant="outlined"
                      >
                        Close
                      </Button>
                    </Grid>
                  </Popover>
                </Grid>
                <Grid size={{ xs: "grow", sm: 4 }}>
                  <GoalList />
                </Grid>
                <Grid size={{ xs: 12, sm: "grow" }}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid size="grow">
                      <TextField
                        fullWidth
                        name="goal"
                        value={requirements.goal}
                        label="Describe your goal"
                        placeholder="e.g., the usage of the learning materials in my course."
                        onChange={handleFormData}
                      />
                    </Grid>
                    <Grid size="auto">
                      <Fab
                        color="primary"
                        size="small"
                        onClick={handleToggleGoalEdit}
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
