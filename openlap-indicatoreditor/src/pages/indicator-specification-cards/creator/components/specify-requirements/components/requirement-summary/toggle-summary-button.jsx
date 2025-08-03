import { IconButton, Tooltip, Typography } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

export default function ToggleSummaryButton({
  showSelections,
  toggleShowSelection,
}) {
  return (
    <Tooltip
      arrow
      title={
        <Typography>
          {showSelections ? "Hide summary" : "Show summary"}
        </Typography>
      }
    >
      <IconButton onClick={toggleShowSelection}>
        {showSelections ? (
          <VisibilityIcon color="primary" />
        ) : (
          <VisibilityOffIcon color="primary" />
        )}
      </IconButton>
    </Tooltip>
  );
}
