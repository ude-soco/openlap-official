import { useId, useLayoutEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Accordion, AccordionDetails, AccordionSummary, Box, Paper, Stack, Tooltip, Typography } from "@mui/material";
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
  connection: [InfoOutlinedIcon, "Uses your connected LRS", "info.main"], reference: [InfoOutlinedIcon, "Reference", "text.secondary"] };
const wideComparison = "@container communityComparison (min-width: 1000px)";

// Container queries keep the comparison above fields on narrow editor panels,
// even when the browser itself is wide (for example an embedded source editor).
export default function CommunityComparison({ step, reference, configuration, children }) {
  const id = useId();
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const summaryRef = useRef(null);
  const [wide, setWide] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const hasReference = Boolean(reference);
  useLayoutEffect(() => {
    if (!hasReference) return;
    const container = containerRef.current, panel = panelRef.current, summary = summaryRef.current;
    const measure = () => {
      setWide(container.getBoundingClientRect().width >= 1000);
      // Measure wrapping text rather than assuming a fixed accordion heading.
      const height = `${summary.getBoundingClientRect().height}px`;
      if (panel.style.getPropertyValue("--community-reference-heading-height") !== height)
        panel.style.setProperty("--community-reference-heading-height", height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container); observer.observe(summary);
    return () => observer.disconnect();
  }, [hasReference]);
  if (!reference) return children;
  const open = expanded ?? wide;
  const rows = communityReferenceRows(step, reference, configuration);
  return <Box ref={containerRef} sx={{ minWidth: 0, containerType: "inline-size", containerName: "communityComparison" }}>
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 2,
      [wideComparison]: { gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)" } }}>
      <Box sx={{ minWidth: 0, gridRow: 2, [wideComparison]: { gridRow: 1 } }}>
        <Typography component="h3" variant="subtitle2" sx={{ mb: 1.5 }}>Your selections</Typography>
        <Stack sx={{ gap: 2, minWidth: 0 }}>{children}</Stack>
      </Box>
      <Paper ref={panelRef} data-community-reference={step} variant="outlined" sx={(theme) => ({
        minWidth: 0, alignSelf: "start", bgcolor: "background.default", overflow: "hidden", gridRow: 1,
        // Editor navigation supplies its measured header + navigator clearance.
        // Standalone comparisons retain their normal toolbar-only offset.
        "--community-reference-top": `var(--editor-sticky-content-top, calc(${theme.mixins.toolbar[theme.breakpoints.up("sm")]?.minHeight ?? 64}px + 1px + ${theme.spacing(2)}))`,
        [wideComparison]: { gridRow: 1, gridColumn: 2, position: "sticky", top: "var(--community-reference-top)",
          maxHeight: `calc(100dvh - var(--community-reference-top) - ${theme.spacing(2)})`,
          "@media (max-height: 360px)": { position: "static", maxHeight: "none" } },
      })}>
        <Accordion expanded={open} onChange={(_, value) => setExpanded(value)} disableGutters elevation={0} sx={{ bgcolor: "transparent", "&::before": { display: "none" } }}>
          <AccordionSummary ref={summaryRef} expandIcon={<ExpandMoreIcon />} aria-controls={`${id}-reference`} id={`${id}-heading`}>
            <Stack sx={{ gap: 0.25 }}><Typography component="h3" variant="subtitle2">Community reference</Typography>
              <Typography variant="caption" color="text.secondary">Read only · differences are allowed</Typography></Stack>
          </AccordionSummary>
          <AccordionDetails data-community-reference-body={step} role="region"
            aria-label={`${step} community reference details`} tabIndex={wide && open ? 0 : undefined}
            sx={(theme) => ({ minWidth: 0, [wideComparison]: {
              maxHeight: `max(0px, calc(100dvh - var(--community-reference-top) - ${theme.spacing(2)} - var(--community-reference-heading-height, 96px) - 2px))`,
              overflowY: "auto", overflowX: "hidden", overscrollBehaviorY: "contain", scrollbarGutter: "stable",
              "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
              "@media (max-height: 360px)": { maxHeight: "none", overflow: "visible" },
            } })}><Stack sx={{ gap: 2 }}>
            {rows.length ? rows.map((row) => { const [Icon, label, color, hint] = statuses[row.status]; return <Stack key={row.key} sx={{ gap: 0.5, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{row.label}</Typography>
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
