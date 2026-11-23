import { useContext, useEffect, useId, useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestSearchGoals } from "./community-pool-api.js";

const emptyAdvanced = { goalVerb: "", goalDescription: "", question: "", indicatorDescription: "" };
const textFields = [
  ["goalDescription", "Describe your goal"],
  ["question", "I am interested in knowing"],
  ["indicatorDescription", "I need an indicator that shows"],
];

export default function IndicatorPoolSearch({ onSearch, applied }) {
  const { api } = useContext(AuthContext);
  const fieldsId = useId();
  const [advanced, setAdvanced] = useState(false);
  const [text, setText] = useState("");
  const [fields, setFields] = useState(emptyAdvanced);
  const [goals, setGoals] = useState([]);
  const [goalsError, setGoalsError] = useState(false);

  useEffect(() => {
    if (!advanced) return;
    const controller = new AbortController();
    setGoalsError(false);
    requestSearchGoals(api, controller.signal)
      .then((options) => { if (!controller.signal.aborted) setGoals(options); })
      .catch(() => { if (!controller.signal.aborted) setGoalsError(true); });
    return () => controller.abort();
  }, [api, advanced]);

  const canSearch = advanced ? textFields.some(([key]) => fields[key].trim()) : Boolean(text.trim());
  const submit = (event) => {
    event.preventDefault();
    if (!canSearch) return;
    onSearch(advanced
      ? { mode: "advanced", ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()])) }
      : { mode: "basic", text: text.trim() });
  };
  const clear = () => {
    setText(""); setFields(emptyAdvanced);
    onSearch(null);
  };

  return <Box component="form" role="search" aria-label="Community indicator search" onSubmit={submit}
    sx={{ flex: advanced ? "1 1 100%" : "3 1 400px", minWidth: 0, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
    {advanced ? <Box id={fieldsId} sx={{ width: "100%", display: "grid", gap: 2,
      gridTemplateColumns: "minmax(0, 1fr)", "@container workspace-dashboard (min-width: 640px)": { gridTemplateColumns: "minmax(150px, 1fr) minmax(0, 3fr)" } }}>
      <TextField size="small" select label="I want to" value={fields.goalVerb}
        onChange={(event) => setFields({ ...fields, goalVerb: event.target.value })}
        helperText={goalsError ? "Goal choices could not be loaded. You can still search." : undefined}>
        <MenuItem value="">Any goal</MenuItem>
        {goals.map((goal) => <MenuItem key={goal} value={goal}>{goal}</MenuItem>)}
      </TextField>
      {textFields.map(([key, label]) => <TextField key={key} size="small" label={label} value={fields[key]}
        slotProps={{ htmlInput: { maxLength: 400 } }} sx={{ gridColumn: key === "goalDescription" ? "auto" : "1 / -1" }}
        onChange={(event) => setFields({ ...fields, [key]: event.target.value })} />)}
      <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>
        Enter a goal description, question, or indicator description to search.
      </Typography>
    </Box> : <TextField id={fieldsId} size="small" label="Search indicators" placeholder="Enter keywords or ask a question"
      sx={{ flex: "1 1 210px", minWidth: 0 }} value={text} slotProps={{ htmlInput: { maxLength: 200 } }}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        if (applied && !next.trim()) onSearch(null);
      }} />}
    <Button type="submit" variant="contained" disabled={!canSearch} startIcon={<SearchIcon />} sx={{ minHeight: 40 }}>Search</Button>
    <Button type="button" aria-expanded={advanced} aria-controls={fieldsId}
      endIcon={advanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      onClick={() => { setAdvanced(!advanced); if (applied) onSearch(null); }}>
      {advanced ? "Basic search" : "Advanced search"}
    </Button>
    {applied && <Button type="button" onClick={clear}>Clear search</Button>}
  </Box>;
}

IndicatorPoolSearch.propTypes = { onSearch: PropTypes.func.isRequired, applied: PropTypes.bool.isRequired };
