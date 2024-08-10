import { useContext } from "react";
import {
  Typography,
  FormControl,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import Condition from "../../../utils/condition";
import { IndicatorEditorContext } from "../../../../../indicator-editor";

const User = () => {
  const { indicatorQuery, setIndicatorQuery } = useContext(
    IndicatorEditorContext
  );

  const handleUpdateUserData = (event) => {
    setIndicatorQuery((prevState) => ({
      ...prevState,
      userQueryCondition: event.target.value,
    }));
  };

  return (
    <>
      <Typography>Users</Typography>
      <FormControl>
        <RadioGroup
          row
          aria-labelledby="radio-buttons-group-role-label"
          name="role"
          value={indicatorQuery.userQueryCondition}
          onChange={handleUpdateUserData}
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
            label="Include all data"
          />
        </RadioGroup>
      </FormControl>
    </>
  );
};

export default User;
