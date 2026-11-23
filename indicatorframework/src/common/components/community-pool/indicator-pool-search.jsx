import { useContext, useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, IconButton, InputAdornment, MenuItem, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestSearchGoals } from "./community-pool-api.js";
import { MEDIUM } from "../workspace-dashboard/workspace-dashboard-styles.js";

const emptyAdvanced = { goalVerb: "", goalDescription: "", question: "", indicatorDescription: "" };
const textFields = [
  ["goalDescription", "Describe your goal"],
  ["question", "I am interested in knowing"],
  ["indicatorDescription", "I need an indicator that shows"],
];

export default function IndicatorPoolSearch({ onSearch, applied }) {
  const { api } = useContext(AuthContext);
  const fieldsId = useId();
  const queryInput = useRef(null);
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
  const changeQuery = (value) => {
    setText(value);
    if (applied && !value.trim()) onSearch(null);
  };

  return <Box component="form" role="search" aria-label="Community indicator search" onSubmit={submit}
    sx={{ flex: "1 1 100%", minWidth: 0, gap: 1, alignItems: "center",
      ...(advanced ? { display: "flex", flexWrap: "wrap" } : {
        display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)",
        [MEDIUM]: { gridTemplateColumns: "minmax(0, 1fr) auto auto" },
      }),
    }}>
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
    </Box> : <>
      <Typography component="label" htmlFor={fieldsId} variant="subtitle2" sx={{ gridColumn: "1 / -1" }}>
        Search indicators
      </Typography>
      <TextField id={fieldsId} inputRef={queryInput} size="small" fullWidth
        placeholder="Keyword or question" value={text} onChange={(event) => changeQuery(event.target.value)}
        sx={{ minWidth: 0, gridColumn: "1 / -1", [MEDIUM]: { gridColumn: "auto" } }}
        slotProps={{
          htmlInput: { maxLength: 200, enterKeyHint: "search" },
          input: {
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            endAdornment: text && <InputAdornment position="end">
              <IconButton type="button" size="small" edge="end" aria-label="Clear search" title="Clear search"
                onClick={() => { changeQuery(""); queryInput.current?.focus(); }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>,
          },
        }} />
    </>}
    <Button type="submit" variant="contained" disabled={!canSearch} startIcon={advanced && <SearchIcon />}
      sx={{ minHeight: 40 }}>Search</Button>
    <Button type="button" aria-expanded={advanced} aria-controls={fieldsId}
      sx={advanced ? undefined : {
        justifySelf: "start", px: 1, whiteSpace: "nowrap",
        "@container workspace-dashboard (max-width: 300px)": { px: 0.5, "& .MuiButton-endIcon": { display: "none" } },
      }}
      endIcon={advanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      onClick={() => { setAdvanced(!advanced); if (applied) onSearch(null); }}>
      {advanced ? "Basic search" : "Advanced search"}
    </Button>
    {advanced && applied && <Button type="button" onClick={() => {
      setText("");
      setFields(emptyAdvanced);
      onSearch(null);
    }}>Clear search</Button>}
  </Box>;
}

IndicatorPoolSearch.propTypes = { onSearch: PropTypes.func.isRequired, applied: PropTypes.bool.isRequired };
