import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import HelpIcon from "@mui/icons-material/Help";
import WarningIcon from "@mui/icons-material/Warning";

const tooltipConfig = {
  description: {
    label: "Description",
    icon: <InfoIcon />,
    color: "info",
  },
  help: {
    label: "Help",
    icon: <HelpIcon />,
    color: "info",
  },
  warning: {
    label: "Caution!",
    icon: <WarningIcon />,
    color: "warning",
  },
};

const CustomTooltip = ({ type = "description", message }) => {
  const config = tooltipConfig[type] || tooltipConfig.description;

  return (
    <Tooltip
      sx={{ cursor: "help" }}
      arrow
      title={
        <Box sx={{ p: 1 }}>
          <Typography>
            <b>{config.label}</b>
          </Typography>
          <Typography dangerouslySetInnerHTML={{ __html: message }} />
        </Box>
      }
    >
      <IconButton color={config.color}>{config.icon}</IconButton>
    </Tooltip>
  );
};

export default CustomTooltip;
