import { useEffect, useState, useContext } from "react";
import {
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionActions,
  Chip,
  Button,
  Divider,
  Grid,
  Typography,
  FormHelperText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import { SelectionContext } from "../../../selection-panel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { fetchAnalyticsTechnique } from "../utils/analytics-api";

const Inputs = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const {
    analysisInputMenu,
    indicatorQuery,
    lockedStep,
    analysisRef,
    setAnalysisRef,
  } = useContext(SelectionContext);

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Inputs</Typography>
        </Grid>
        {state.inputs?.map((input, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <FormControl fullWidth>
              <InputLabel>{input.title}</InputLabel>

              <Select label={input.title}>
                {Object.values(analysisInputMenu).map((value, index) => (
                  <MenuItem key={index}>{value.name}</MenuItem>
                ))}
              </Select>
              {Boolean(input.required) && (
                <FormHelperText>Required</FormHelperText>
              )}
            </FormControl>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default Inputs;
