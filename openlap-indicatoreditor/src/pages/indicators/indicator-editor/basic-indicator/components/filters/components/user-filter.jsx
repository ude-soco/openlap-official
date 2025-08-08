import { useContext } from "react";
import {
  Accordion,
  AccordionDetails,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Condition } from "../../../../utils/indicator-data";
import { BasicContext } from "../../../basic-indicator";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";

export default function UserFilter() {
  const { filters, setFilters } = useContext(BasicContext);

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
          <Grid container alignItems="center">
            <Typography>Select users</Typography>
            <CustomTooltip type="description" message={`To be decided!`} />
          </Grid>
          <FormControl name="role">
            <RadioGroup
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
                label="Use all except my data"
              />
              <FormControlLabel
                value={Condition.all}
                control={<Radio />}
                label="Use data of all users"
              />
            </RadioGroup>
          </FormControl>
        </AccordionDetails>
      </Accordion>
    </>
  );
}
