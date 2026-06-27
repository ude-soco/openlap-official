import PropTypes from "prop-types";
import { Box, Button, Container, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import ToggleColorMode from "../toggle-color-mode/toggle-color-mode";

// Shared header for the public auth pages (login/register/privacy):
// keyboard-accessible logo back to home, theme toggle, and a cross-link button.
const AuthHeader = ({ crossLink }) => {
  const navigate = useNavigate();
  const goHome = () => navigate("/");

  return (
    <Box component="header">
      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
        }}
      >
        <Box
          component="img"
          src={OpenLAPLogo}
          alt="OpenLAP"
          role="button"
          tabIndex={0}
          aria-label="OpenLAP, go to homepage"
          sx={{ width: { xs: 104, sm: 120 }, height: "auto", cursor: "pointer" }}
          onClick={goHome}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goHome();
            }
          }}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleColorMode />
          {crossLink && (
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate(crossLink.to)}
            >
              {crossLink.label}
            </Button>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

AuthHeader.propTypes = {
  crossLink: PropTypes.shape({
    label: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
  }),
};

export default AuthHeader;
