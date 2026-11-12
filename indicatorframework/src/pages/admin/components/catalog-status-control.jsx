import PropTypes from "prop-types";
import { Chip, Stack, Switch, Typography } from "@mui/material";
import { useState } from "react";
import CustomDialog from "../../../common/components/custom-dialog/custom-dialog";

const escapeHtml = (value) =>
  String(value || "item")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const usageSummary = (usage) => {
  const indicators = usage?.indicatorCount ?? 0;
  const users = usage?.uniqueUserCount ?? 0;
  return `${indicators} ${indicators === 1 ? "indicator" : "indicators"} / ${users} ${
    users === 1 ? "user" : "users"
  }`;
};

const dialogContent = ({ nextEnabled, name, usage }) => {
  const safeName = escapeHtml(name);
  if (nextEnabled) {
    return `Enable <b>${safeName}</b> for new selections?`;
  }
  return `Disable <b>${safeName}</b>?<br/>Existing indicators keep working, but it will no longer appear for new selections.<br/><br/>Current usage: ${usageSummary(
    usage
  )}.`;
};

const CatalogStatusControl = ({ enabled, name, usage, disabled = false, onChange }) => {
  const [pendingEnabled, setPendingEnabled] = useState(enabled);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const openConfirm = (nextEnabled) => {
    setPendingEnabled(nextEnabled);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    await onChange(pendingEnabled);
  };

  return (
    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
      <Chip
        size="small"
        color={enabled ? "success" : "default"}
        variant={enabled ? "filled" : "outlined"}
        label={enabled ? "Enabled" : "Disabled"}
      />
      <Switch
        checked={enabled}
        disabled={disabled}
        onChange={(event) => openConfirm(event.target.checked)}
        inputProps={{
          "aria-label": `${enabled ? "Disable" : "Enable"} ${name || "item"}`,
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {enabled ? "Selectable" : "Hidden"}
      </Typography>

      <CustomDialog
        type="confirm"
        open={confirmOpen}
        toggleOpen={() => setConfirmOpen((prev) => !prev)}
        handler={handleConfirm}
        content={dialogContent({ nextEnabled: pendingEnabled, name, usage })}
      />
    </Stack>
  );
};

CatalogStatusControl.propTypes = {
  enabled: PropTypes.bool.isRequired,
  name: PropTypes.string,
  usage: PropTypes.shape({
    indicatorCount: PropTypes.number,
    uniqueUserCount: PropTypes.number,
  }),
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

export default CatalogStatusControl;
