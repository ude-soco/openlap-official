import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRounded from "@mui/icons-material/RadioButtonUncheckedRounded";
import {
  ALLOWED_SPECIAL_CHARACTERS,
  getPasswordCriteria,
} from "../../utils/password-policy";

const srOnly = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Guidance-only checklist mirroring the OpenLAP password policy (same markup as
 * the Register page). Each rule's met/unmet state is exposed to screen readers
 * via visually-hidden " — met"/" — not met" text. Purely informational: it does
 * not gate submission (the backend remains authoritative).
 */
const PasswordChecklist = ({ password }) => {
  const criteria = getPasswordCriteria(password);
  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.custom.radii.input}px`,
        px: 2,
        py: 1.5,
      })}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1, fontWeight: 600 }}
      >
        Password requirements:
      </Typography>
      <Stack spacing={0.75} role="list" aria-label="Password requirements">
        {criteria.map((c) => (
          <Stack
            key={c.id}
            role="listitem"
            direction="row"
            spacing={1}
            alignItems="center"
          >
            {c.met ? (
              <CheckCircleRounded sx={{ fontSize: 18, color: "success.main" }} />
            ) : (
              <RadioButtonUncheckedRounded
                sx={{ fontSize: 18, color: "text.disabled" }}
              />
            )}
            <Typography
              variant="caption"
              color={c.met ? "text.primary" : "text.secondary"}
            >
              {c.label}
              <Box component="span" sx={srOnly}>
                {c.met ? " — met" : " — not met"}
              </Box>
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 1.5 }}
      >
        {`Allowed special characters: ${ALLOWED_SPECIAL_CHARACTERS}`}
      </Typography>
    </Box>
  );
};

PasswordChecklist.propTypes = {
  password: PropTypes.string.isRequired,
};

export default PasswordChecklist;
