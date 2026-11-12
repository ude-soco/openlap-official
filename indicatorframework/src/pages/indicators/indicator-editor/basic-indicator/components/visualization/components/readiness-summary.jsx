import PropTypes from "prop-types";
import { Stack, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import SectionCard from "../../../../../../../common/components/section-card/section-card";

/**
 * Compact, read-only confidence checklist shown just above Save. It reflects
 * the current wizard state (it does not gate or change save behavior).
 */
const ReadinessSummary = ({ items }) => {
  const allDone = items.every((item) => item.done);
  return (
    <SectionCard title={allDone ? "Everything looks good" : "Almost there"}>
    <Stack gap={1}>
      {items.map((item) => (
        <Stack key={item.label} direction="row" gap={1} alignItems="center">
          {item.done ? (
            <CheckCircleRoundedIcon color="success" fontSize="small" />
          ) : (
            <RadioButtonUncheckedRoundedIcon
              color="disabled"
              fontSize="small"
            />
          )}
          <Typography
            variant="body2"
            color={item.done ? "text.primary" : "text.secondary"}
          >
            {item.label}
          </Typography>
        </Stack>
      ))}
      </Stack>
    </SectionCard>
  );
};

ReadinessSummary.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      done: PropTypes.bool,
    })
  ).isRequired,
};

export default ReadinessSummary;
