import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Condition } from "../../../../utils/indicator-data";
import { useContext, useState } from "react";
import { BasicContext } from "../../../basic-indicator";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";

export default function UserFilter() {
  const { filters, setFilters } = useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: null,
    tipDescription: `
        <b>Tip!</b><br/>
        To be decided!
      `,
  });

  const handleUserFilterPopoverAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

  const handleChangeUserFilter = (event) => {
    setFilters((p) => ({ ...p, selectedUserFilter: event.target.value }));
  };

  return (
    <>
      <Accordion
        defaultExpanded
        sx={{
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "none",
        }}
      >
        <AccordionDetails>
          <Grid container spacing={1} alignItems="center">
            <Typography>Select users</Typography>
            <TipPopover
              tipAnchor={state.tipAnchor}
              toggleTipAnchor={handleUserFilterPopoverAnchor}
              description={state.tipDescription}
            />
          </Grid>
          <FormControl name="role">
            <RadioGroup
              row
              name="role"
              value={filters.selectedUserFilter}
              onChange={handleChangeUserFilter}
            >
              <FormControlLabel
                value={Condition.only_me}
                control={<Radio />}
                label="Use only my data"
              />
              <FormControlLabel
                value={Condition.exclude_me}
                control={<Radio />}
                label="Exclude my data"
              />
              <FormControlLabel
                value={Condition.all}
                control={<Radio />}
                label="Use all data"
              />
            </RadioGroup>
          </FormControl>
        </AccordionDetails>
      </Accordion>
    </>
  );
}
