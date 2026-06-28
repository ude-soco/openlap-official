import PropTypes from "prop-types";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

// A single decision presented as a calm, bordered card. It is a real <button>
// (ButtonBase) so keyboard nav, focus trap and screen-reader semantics are
// unchanged — only the presentation differs from a stacked button. `tone`
// drives the emphasis: neutral (secondary), recommended (success), or
// destructive (error). Behaviour lives entirely in the passed `onClick`.
const DecisionCard = ({
  icon,
  title,
  description,
  onClick,
  disabled,
  tone = "neutral",
  recommended,
}) => (
  <ButtonBase
    focusRipple
    disabled={disabled}
    onClick={onClick}
    aria-label={title}
    sx={(t) => {
      const accent =
        tone === "destructive"
          ? t.palette.error
          : tone === "recommended"
            ? t.palette.success
            : null;
      const accentColor =
        tone === "destructive"
          ? "error.main"
          : tone === "recommended"
            ? "success.main"
            : "text.secondary";
      return {
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        textAlign: "left",
        gap: 1.5,
        p: 2,
        borderRadius: `${t.custom.radii.card}px`,
        border: "1px solid",
        borderColor: accent ? alpha(accent.main, 0.5) : t.palette.divider,
        backgroundColor:
          tone === "recommended"
            ? alpha(t.palette.success.main, 0.06)
            : "transparent",
        transition: t.transitions.create([
          "background-color",
          "border-color",
          "box-shadow",
        ]),
        "&:hover": {
          borderColor: accent ? accent.main : t.palette.text.primary,
          backgroundColor:
            tone === "recommended"
              ? alpha(t.palette.success.main, 0.12)
              : t.palette.action.hover,
        },
        "&.Mui-focusVisible": {
          outline: `2px solid ${accent ? accent.main : t.palette.primary.main}`,
          outlineOffset: 2,
        },
        "&.Mui-disabled": { opacity: 0.5 },
        // Keep the accent reference used (color applied to the icon below).
        "& .decision-card__icon": { color: accentColor },
      };
    }}
  >
    <Box
      className="decision-card__icon"
      component="span"
      sx={{ display: "flex", mt: "2px" }}
    >
      {icon}
    </Box>
    <Stack gap={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Typography
          variant="subtitle2"
          fontWeight={600}
          color={tone === "destructive" ? "error.main" : "text.primary"}
        >
          {title}
        </Typography>
        {recommended && (
          <Chip size="small" color="success" label="Recommended" />
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Stack>
  </ButtonBase>
);

DecisionCard.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string.isRequired,
  description: PropTypes.node,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  tone: PropTypes.oneOf(["neutral", "recommended", "destructive"]),
  recommended: PropTypes.bool,
};

// Leave-page confirmation for an in-progress EDIT draft (Phase 3). Shown when the
// user navigates away (within the creator) before publishing changes to the
// saved ISC. Calm styling: "Keep this draft" is the recommended, safest action;
// only "Discard" is destructive. Behaviour is unchanged — the same callbacks run.
const LeaveEditDialog = ({
  open,
  saving,
  onSave,
  onKeep,
  onDiscard,
  onCancel,
}) => (
  <Dialog
    open={Boolean(open)}
    onClose={onCancel}
    aria-labelledby="leave-edit-title"
    aria-describedby="leave-edit-description"
    maxWidth="xs"
    fullWidth
  >
    <DialogTitle id="leave-edit-title" sx={{ pb: 1 }}>
      Leave this editing session?
    </DialogTitle>
    <DialogContent>
      <DialogContentText id="leave-edit-description" sx={{ mb: 2.5 }}>
        You have unpublished changes for this ISC. Choose what should happen
        before leaving.
      </DialogContentText>
      <Stack gap={2}>
        <DecisionCard
          tone="neutral"
          icon={<SaveOutlinedIcon />}
          title="Save changes"
          description="Update the saved ISC and remove this draft."
          disabled={saving}
          onClick={onSave}
        />
        <DecisionCard
          tone="recommended"
          recommended
          icon={<DescriptionOutlinedIcon />}
          title="Keep this draft"
          description="Leave now and continue editing later from My ISCs."
          disabled={saving}
          onClick={onKeep}
        />
        <DecisionCard
          tone="destructive"
          icon={<DeleteOutlineIcon />}
          title="Discard changes"
          description="Delete this editing draft. The saved ISC will stay unchanged."
          disabled={saving}
          onClick={onDiscard}
        />
      </Stack>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
      <Button onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </DialogActions>
  </Dialog>
);

LeaveEditDialog.propTypes = {
  open: PropTypes.bool,
  saving: PropTypes.bool,
  onSave: PropTypes.func.isRequired,
  onKeep: PropTypes.func.isRequired,
  onDiscard: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default LeaveEditDialog;
