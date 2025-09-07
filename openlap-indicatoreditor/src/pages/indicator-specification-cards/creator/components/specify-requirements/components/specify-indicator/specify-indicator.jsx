import { useContext, useState } from "react";
import { Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";

import { ISCContext } from "../../../../indicator-specification-card";
import DataList from "./data-list";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";

export default function SpecifyIndicator() {
  const { requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    indicatorPopoverAnchor: null,
    // TODO: Description needs to be updated
    indicatorDescription: `
      <b>Step 3: Describe your indicator</b><br/>  
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

  const handleFormData = (e) => {
    const { name, value } = e.target;
    setRequirements((p) => ({ ...p, [name]: value }));
  };

  const handleIndicatorPopoverAnchor = (param) => {
    setState((p) => ({ ...p, indicatorPopoverAnchor: param }));
  };

  return (
    <Stack gap={2}>
      <Grid container spacing={1} alignItems="center">
        <Typography>Specify your indicator</Typography>
        <TipPopover
          tipAnchor={state.indicatorPopoverAnchor}
          toggleTipAnchor={handleIndicatorPopoverAnchor}
          description={state.indicatorDescription}
        />
      </Grid>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Grid container alignItems="center" spacing={2}>
              <Grid size={{ xs: "grow" }}>
                <TextField
                  multiline
                  fullWidth
                  required
                  name="indicatorName"
                  value={requirements.indicatorName}
                  label="I need an indicator showing"
                  placeholder="e.g., the number of views of learning materials and sort by the most viewed ones."
                  onChange={handleFormData}
                  error={requirements.indicatorName === ""}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <DataList />
          </Grid>
        </Grid>
      </Grid>
    </Stack>
  );
}
