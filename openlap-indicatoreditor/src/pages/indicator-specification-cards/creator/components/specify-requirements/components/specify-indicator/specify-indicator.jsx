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

import { ISCContext } from "../../../../indicator-specification-card";
import DataList from "./data-list";

export default function SpecifyIndicator() {
  const { requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    indicatorPopoverAnchor: null,
  });

  const handleFormData = (e) => {
    const { name, value } = e.target;
    setRequirements((p) => ({ ...p, [name]: value }));
  };

  const handleIndicatorPopoverAnchor = (param) => {
    setState((p) => ({ ...p, indicatorPopoverAnchor: param }));
  };

  return (
    <Grid container justifyContent="center">
      <Grid size={{ xs: 12, md: 8 }}>
        <Grid container spacing={1}>
          <Grid size="grow">
            <Typography variant="body2" gutterBottom>
              Specify your indicator
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
                    onClick={(e) =>
                      handleIndicatorPopoverAnchor(e.currentTarget)
                    }
                  >
                    <TipsAndUpdatesIcon />
                  </IconButton>
                </Tooltip>
                <Popover
                  open={Boolean(state.goalPopoverAnchor)}
                  anchorEl={state.goalPopoverAnchor}
                  onClose={() => handleIndicatorPopoverAnchor(null)}
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
                      onClick={() => handleIndicatorPopoverAnchor(null)}
                      color="text"
                      variant="outlined"
                    >
                      Close
                    </Button>
                  </Grid>
                </Popover>
              </Grid>

              <Grid size={{ xs: "grow" }}>
                <TextField
                  fullWidth
                  required
                  name="indicatorName"
                  value={requirements.indicatorName}
                  label="I need an indicator showing"
                  placeholder="e.g., the number of views of learning materials and sort by the most viewed ones."
                  onChange={handleFormData}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <DataList />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
