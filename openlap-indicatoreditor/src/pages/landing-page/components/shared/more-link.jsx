import { Box, Link } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

// "More …" link that opens an external page in a new tab, with the arrow
// nudging to the right on hover.
const MoreLink = ({ label, href }) => (
  <Box>
    <Link
      component="button"
      color="primary"
      fontWeight="bold"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        "& > svg": { transition: "0.2s" },
        "&:hover > svg": { transform: "translateX(4px)" },
      }}
      onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
    >
      <span>{label}</span>
      <OpenInNewIcon fontSize="small" sx={{ mt: "1px", ml: "2px" }} />
    </Link>
  </Box>
);

export default MoreLink;
