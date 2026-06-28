import { useContext } from "react";
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import { Condition } from "../../../../utils/indicator-data";
import { BasicContext } from "../../../basic-indicator";
import FilterSection from "./filter-section";

export default function UserFilter() {
  const { filters, setFilters, setAnalysis } = useContext(BasicContext);

  const handleChangeUserFilter = (event) => {
    setFilters((p) => ({ ...p, selectedUserFilter: event.target.value }));
    setAnalysis((p) => ({ ...p, analyzedData: {} }));
  };

  return (
    <FilterSection
      title="User scope"
      helper="Choose whose data to include in the analysis."
    >
      <FormControl>
        <RadioGroup
          aria-label="User scope"
          name="user-scope"
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
    </FilterSection>
  );
}
