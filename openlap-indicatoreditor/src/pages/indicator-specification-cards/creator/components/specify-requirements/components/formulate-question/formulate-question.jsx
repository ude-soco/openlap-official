import { Button, Divider, Paper, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useContext, useState } from "react";
import { ISCContext } from "../../../../indicator-specification-card";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover.jsx";

export default function FormulateQuestion() {
  const { requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    questionPopoverAnchor: null,
    // TODO: Description needs to be updated
    questionDescription: `
      <b>Step 2: Formulate a question</b><br/>  
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
      <Grid container justifyContent="center" spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Divider />
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid
            component={Paper}
            variant="outlined"
            container
            spacing={2}
            sx={{ p: 2 }}
          >
            <Grid size="grow">
              <Grid container spacing={1} alignItems="center">
                <Typography>Formulate your question</Typography>
                <TipPopover
                  tipAnchor={state.questionPopoverAnchor}
                  toggleTipAnchor={handleQuestionPopoverAnchor}
                  description={state.questionDescription}
                />
              </Grid>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: "grow" }}>
                  <Grid container spacing={2}>
                    <Grid size="grow">
                      <TextField
                        multiline
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
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Grid container justifyContent="center" spacing={2}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <Button
                    color="primary"
                    variant="contained"
                    fullWidth
                    onClick={handleToggleQuestionEdit}
                    disabled={handleDisabledFabButton()}
                  >
                    Confirm
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}
