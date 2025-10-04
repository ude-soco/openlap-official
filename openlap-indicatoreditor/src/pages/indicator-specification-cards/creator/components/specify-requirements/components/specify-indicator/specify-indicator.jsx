import { useContext, useState } from "react";
import { Grid, TextField, Typography, Avatar, Stack } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import { ISCContext } from "../../../../indicator-specification-card";
import DataList from "./data-list";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";
import { DataTypes } from "../../../../utils/data/config";

export default function SpecifyIndicator() {
  const { requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    indicatorPopoverAnchor: null,
    indicatorDescription: `
      <b>Step 3: Define your indicator</b><br/>
      How would you like to describe your indicator? Here you can specify the name of the prototype indicator you want to create. <br/>
      You will also need to specify the name and type of data you think you will need to create this indicator.<br/>
      There are three types of data to choose from: <br/>
      (1) Categorical<br/>(2) Numerical, and<br/>(3) Categorical (ordinal)
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
            <BarChartIcon />
          </Avatar>
        </Grid>
      </Grid>
      <Grid size="grow" sx={{ pb: 2 }}>
        <Stack gap={2}>
          <Grid container spacing={1} alignItems="center">
            <Typography>Define your indicator</Typography>
            <TipPopover
              tipAnchor={state.indicatorPopoverAnchor}
              toggleTipAnchor={handleIndicatorPopoverAnchor}
              description={state.indicatorDescription}
            />
          </Grid>
          <TextField
            multiline
            fullWidth
            required
            name="indicatorName"
            value={requirements.indicatorName}
            label="I need an indicator that shows"
            placeholder="e.g., the number of views of learning materials and sort by the most viewed ones."
            onChange={handleFormData}
            error={requirements.indicatorName === ""}
            sx={{ pb: 2 }}
          />
          <DataList />
        </Stack>
      </Grid>
    </Grid>
  );
}
