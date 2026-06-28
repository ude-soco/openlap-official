import PropTypes from "prop-types";
import { Avatar, Box, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

// Circular avatar that reveals a clickable "view profile" overlay on hover.
// `size` sets the avatar dimensions; `iconFontSize` sizes the overlay icon.
const ProfileAvatar = ({ image, name, link, size, iconFontSize }) => (
  <Box
    sx={{
      position: "relative",
      width: size,
      height: size,
      mb: 2,
      "&:hover .profile-overlay": { opacity: 1 },
    }}
  >
    <Avatar
      src={image}
      alt={name}
      imgProps={{ loading: "lazy" }}
      sx={{ width: "100%", height: "100%" }}
    />
    <Tooltip arrow title={`View ${name}'s profile`}>
      <Box
        component="a"
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${name}'s profile`}
        className="profile-overlay"
        sx={{
          position: "absolute",
          cursor: "pointer",
          textDecoration: "none",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          bgcolor: "rgba(0,0,0,0.5)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0,
          transition: "opacity 0.3s ease",
          "&:focus-visible": { opacity: 1 },
        }}
      >
        <SearchIcon fontSize={iconFontSize} sx={{ color: "white" }} />
      </Box>
    </Tooltip>
  </Box>
);

ProfileAvatar.propTypes = {
  image: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  size: PropTypes.number,
  iconFontSize: PropTypes.string,
};

export default ProfileAvatar;
