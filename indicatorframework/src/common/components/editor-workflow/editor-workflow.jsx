import { useEffect, useId, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { visuallyHidden } from "@mui/utils";
import { EditorWorkflowContext } from "./editor-workflow-context.js";
import { lockedStepHint, stepStatusText } from "./editor-navigation-model.js";
import useEditorNavigation from "./use-editor-navigation.js";

function StepIcon({ step, index, selected }) {
  if (step.locked) return <LockOutlinedIcon fontSize="small" />;
  if (step.needsReview) return <ErrorOutlineIcon fontSize="small" color="warning" />;
  if (step.completed) return <CheckCircleIcon fontSize="small" color="primary" />;
  return <Box component="span" sx={{ width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, border: "1px solid", borderColor: selected ? "primary.main" : "divider", bgcolor: selected ? "primary.main" : "transparent", color: selected ? "primary.contrastText" : "text.secondary" }}>{index + 1}</Box>;
}
StepIcon.propTypes = { step: PropTypes.object.isRequired, index: PropTypes.number.isRequired, selected: PropTypes.bool };

/** Compact, persistent in-page navigation, independent of editor validation. */
export default function EditorWorkflow({ steps, current, onStepSelect, disabled = false, focusOnMount, ariaLabel, children }) {
  const id = useId();
  const navigation = useEditorNavigation({ steps, current, onStepSelect, disabled, focusOnMount });
  const { rootRef, navRef, currentKey, compact, announcement, select } = navigation;
  const [menu, setMenu] = useState(null);
  useEffect(() => { if (disabled || !compact) setMenu(null); }, [disabled, compact]);
  const context = useMemo(() => ({ id }), [id]);
  const index = Math.max(0, steps.findIndex((step) => step.key === currentKey));
  const selected = steps[index];
  const choose = (step, event) => {
    if (!step.locked) setMenu(null);
    select(step.key, event?.nativeEvent);
  };
  const cancelMenu = () => {
    const anchor = menu;
    setMenu(null);
    anchor?.focus({ preventScroll: true });
  };
  const label = (step) => `${step.label}, ${stepStatusText(step)}`;
  return <EditorWorkflowContext.Provider value={context}>
    <Stack ref={rootRef} data-editor-workflow sx={{ gap: 2, minWidth: 0, width: "100%", overflow: "visible",
      "--editor-sticky-content-top": "calc(var(--editor-header-height, 65px) + var(--editor-navigation-height, 58px) + 16px)",
    }}>
      <Box ref={navRef} component="nav" data-editor-navigation aria-label={ariaLabel} sx={(theme) => ({
        position: "sticky", top: "var(--editor-header-height, 65px)", zIndex: theme.zIndex.appBar - 1,
        bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: `${theme.custom.radii.card}px`,
        boxShadow: theme.custom.shadows.sm, minWidth: 0, p: 0.5,
        "& .MuiButton-root": { minHeight: 44 },
      })}>
        {compact ? <>
          <Button fullWidth disabled={disabled} aria-current="step" aria-haspopup="menu" aria-expanded={Boolean(menu) && !disabled} aria-controls={menu && !disabled ? `${id}-steps` : undefined}
            onClick={(event) => setMenu(event.currentTarget)} endIcon={<ExpandMoreIcon />} sx={{ justifyContent: "space-between", gap: 1 }}>
            <Stack component="span" direction="row" sx={{ gap: 1, alignItems: "center", minWidth: 0 }}>
              <StepIcon step={selected} index={index} selected />
              <Typography component="span" variant="body2" noWrap>{selected?.label} · Step {index + 1} of {steps.length}</Typography>
            </Stack>
          </Button>
          <Menu id={`${id}-steps`} anchorEl={menu} open={Boolean(menu) && !disabled} onClose={cancelMenu} disableRestoreFocus
            slotProps={{ list: { "aria-label": ariaLabel }, paper: { sx: { maxWidth: "calc(100vw - 32px)", minWidth: "min(260px, calc(100vw - 32px))" } } }}>
            {steps.map((step, number) => <MenuItem key={step.key} selected={currentKey === step.key} disabled={disabled}
              aria-disabled={step.locked || disabled || undefined} aria-current={currentKey === step.key ? "step" : undefined}
              aria-controls={step.locked ? undefined : `${id}-${step.key}`} aria-label={step.locked ? `${label(step)}. ${lockedStepHint(steps, step)}` : label(step)}
              onClick={(event) => choose(step, event)} sx={{ gap: 1.5, minHeight: 48, whiteSpace: "normal" }}>
              <StepIcon step={step} index={number} selected={currentKey === step.key} />
              <Stack sx={{ minWidth: 0 }}><Typography variant="body2">{step.label}</Typography>
                <Typography variant="caption" color="text.secondary">{step.locked ? lockedStepHint(steps, step) : stepStatusText(step)}</Typography></Stack>
            </MenuItem>)}
          </Menu>
        </> : <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: 0.5 }}>
          {steps.map((step, number) => <Tooltip key={step.key} title={step.locked ? lockedStepHint(steps, step) : `${step.label}: ${stepStatusText(step)}`} describeChild>
            <Button disabled={disabled} aria-disabled={step.locked || disabled || undefined} aria-label={label(step)}
              aria-controls={step.locked ? undefined : `${id}-${step.key}`} aria-current={currentKey === step.key ? "step" : undefined}
              onClick={(event) => choose(step, event)} sx={(theme) => ({ gap: 1, minWidth: 0, px: 1,
                color: currentKey === step.key ? "primary.main" : step.locked ? "text.secondary" : "text.primary",
                bgcolor: currentKey === step.key ? alpha(theme.palette.primary.main, 0.08) : "transparent", borderBottom: "2px solid",
                borderBottomColor: currentKey === step.key ? "primary.main" : "transparent" })}>
              <StepIcon step={step} index={number} selected={currentKey === step.key} />
              <Typography component="span" variant="body2" noWrap>{step.label}</Typography>
            </Button>
          </Tooltip>)}
        </Box>}
        <Box role="status" aria-live="polite" sx={visuallyHidden}>{announcement}</Box>
      </Box>
      {children}
    </Stack>
  </EditorWorkflowContext.Provider>;
}
EditorWorkflow.propTypes = { steps: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.string.isRequired,
  locked: PropTypes.bool, completed: PropTypes.bool, needsReview: PropTypes.bool, lockedHint: PropTypes.string })).isRequired,
current: PropTypes.string, onStepSelect: PropTypes.func.isRequired, disabled: PropTypes.bool, focusOnMount: PropTypes.string,
ariaLabel: PropTypes.string.isRequired, children: PropTypes.node };
