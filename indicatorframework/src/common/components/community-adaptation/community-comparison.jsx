import { useId, useState } from "react";
import PropTypes from "prop-types";
import { Accordion, AccordionDetails, AccordionSummary, Box, Paper, Stack, Tooltip, Typography, useMediaQuery } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import ChangeCircleOutlinedIcon from "@mui/icons-material/ChangeCircleOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import { communityReferenceRows } from "./community-reference-model.js";

const statuses = { same: [CheckCircleOutlineIcon, "Same as community", "success.main"], changed: [ChangeCircleOutlinedIcon, "Changed", "info.main"],
  labelMatch: [CheckCircleOutlineIcon, "Matching label", "success.main", "The displayed names match. The community identifier is hidden for privacy, so confirm the meaning in your data."],
  uncomparable: [InfoOutlinedIcon, "Not directly comparable", "text.secondary", "The community selection is not fully shared. Review the reference when choosing your own data."],
  needed: [InfoOutlinedIcon, "Needs selection", "text.secondary"], unavailable: [ErrorOutlineIcon, "Unavailable", "warning.main"],
  personal: [InfoOutlinedIcon, "Uses your own data", "info.main"], reference: [InfoOutlinedIcon, "Reference", "text.secondary"] };

// Container queries keep the comparison above fields on narrow editor panels,
// even when the browser itself is wide (for example an embedded source editor).
export default function CommunityComparison({ step, reference, configuration, children }) {
  const id = useId();
  const initiallyExpanded = useMediaQuery("(min-width: 1280px)");
  const [expanded, setExpanded] = useState(null);
  if (!reference) return children;
  const rows = communityReferenceRows(step, reference, configuration);
  return <Box sx={{ minWidth: 0, containerType: "inline-size", containerName: "communityComparison" }}>
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 2,
      "@container communityComparison (min-width: 1000px)": { gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)" } }}>
      <Box sx={{ minWidth: 0, gridRow: 2, "@container communityComparison (min-width: 1000px)": { gridRow: 1 } }}>
        <Typography component="h3" variant="subtitle2" sx={{ mb: 1.5 }}>Your selections</Typography>
        <Stack sx={{ gap: 2, minWidth: 0 }}>{children}</Stack>
      </Box>
      <Paper variant="outlined" sx={{ minWidth: 0, alignSelf: "start", bgcolor: "background.default", overflow: "hidden", gridRow: 1,
        "@container communityComparison (min-width: 1000px)": { gridRow: 1, gridColumn: 2 } }}>
        <Accordion expanded={expanded ?? initiallyExpanded} onChange={(_, value) => setExpanded(value)} disableGutters elevation={0} sx={{ bgcolor: "transparent", "&::before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${id}-reference`} id={`${id}-heading`}>
            <Stack sx={{ gap: 0.25 }}><Typography component="h3" variant="subtitle2">Community reference</Typography>
              <Typography variant="caption" color="text.secondary">Read only · differences are allowed</Typography></Stack>
          </AccordionSummary>
          <AccordionDetails id={`${id}-reference`}><Stack sx={{ gap: 2 }}>
            {rows.length ? rows.map((row) => { const [Icon, label, color, hint] = statuses[row.status]; return <Stack key={row.key} sx={{ gap: 0.5, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">{row.label}</Typography>
              <Typography variant="body2" sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{row.value || "Not specified"}</Typography>
              <Tooltip title={hint || ""} describeChild><Stack component="span" tabIndex={hint ? 0 : undefined} direction="row" sx={{ alignItems: "center", gap: 0.5, color, width: "fit-content" }}><Icon sx={{ fontSize: 16 }} /><Typography variant="caption">{label}</Typography></Stack></Tooltip>
            </Stack>; }) : <Typography variant="body2" color="text.secondary">No community settings for this step.</Typography>}
          </Stack></AccordionDetails>
        </Accordion>
      </Paper>
    </Box>
  </Box>;
}
CommunityComparison.propTypes = { step: PropTypes.string.isRequired, reference: PropTypes.object, configuration: PropTypes.object, children: PropTypes.node };
