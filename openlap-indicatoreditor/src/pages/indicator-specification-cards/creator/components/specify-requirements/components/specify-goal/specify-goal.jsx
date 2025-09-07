import { useContext, useState } from "react";
import {
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";

import GoalList from "./goal-list";
import { ISCContext } from "../../../../indicator-specification-card";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover.jsx";

export default function SpecifyGoal() {
  const { requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    goalPopoverAnchor: null,
    goalDescription: `
      <b>Step 1: Clarify your goal</b><br/>
      What are you trying to monitor or improve?    
      Here are some <b>Examples</b> for inspiration:
      <ul>
        <li>I want to <b>assess</b> students’ understanding of course material by analyzing quiz and test results weekly.</li>
        <li>I want to <b>monitor</b> student engagement by tracking logins, participation in discussions, and time spent on learning activities.</li>
        <li>I want to <b>intervene</b> early by identifying students at risk of failure using predictive models based on past performance and engagement.</li>
      </ul>
      You can select one of the goals from the list. You can also create your own goal by typing in this text box and then adding it to the list.    
      `,
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
      <Grid container justifyContent="center" spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack component={Paper} variant="outlined" gap={2} sx={{ p: 3 }}>
            <Grid container spacing={1} alignItems="center">
              <Typography>Specify your goal</Typography>
              <TipPopover
                tipAnchor={state.goalPopoverAnchor}
                toggleTipAnchor={handleGoalPopoverAnchor}
                description={state.goalDescription}
              />
            </Grid>
            <GoalList />
            <TextField
              required
              fullWidth
              name="goal"
              multiline
              value={requirements.goal}
              label="Describe your goal"
              placeholder="e.g., the usage of the learning materials in my course."
              onChange={handleFormData}
              error={requirements.goal === ""}
            />
            <Grid container justifyContent="center" spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <Button
                  fullWidth
                  color="primary"
                  variant="contained"
                  onClick={handleToggleGoalEdit}
                  disabled={handleDisabledFabButton()}
                >
                  Confirm
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </Grid>
        {!requirements.edit.question && <Divider />}
      </Grid>
    </>
  );
}
