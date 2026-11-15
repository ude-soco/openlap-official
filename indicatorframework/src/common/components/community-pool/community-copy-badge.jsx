import PropTypes from "prop-types";
import { Chip } from "@mui/material";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";

/** The same community symbol is used in the navigation and copied workspaces. */
export function CommunityCopyBadge({ label = "Community copy" }) {
  return <Chip size="small" variant="outlined" color="primary" icon={<HubOutlinedIcon />}
    label={label} sx={{ maxWidth: "100%", alignSelf: "flex-start", "& .MuiChip-label": { overflow: "hidden" } }} />;
}
CommunityCopyBadge.propTypes = { label: PropTypes.string };
export default CommunityCopyBadge;
