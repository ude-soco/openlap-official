import { useState } from "react";
import {
  alpha,
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  MenuItem,
  Toolbar,
  Typography,
  useScrollTrigger,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import ToggleColorMode from "../../../common/components/toggle-color-mode/toggle-color-mode";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import { useNavigate } from "react-router-dom";
import { navigationIds, navigationItems } from "../data/navigation-data";
import { scrollToSection } from "../../../common/utils/scroll-to-section";
import { entrance, fadeDown } from "./shared/motion";

const logoStyle = {
  width: "120px",
  height: "auto",
  cursor: "pointer",
};

const AppAppBar = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 8 });

  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };

  const handleNav = (sectionId) => {
    scrollToSection(sectionId);
    setOpen(false);
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        boxShadow: 0,
        bgcolor: "transparent",
        backgroundImage: "none",
        mt: scrolled ? 1.5 : 2.5,
        transition: `margin ${theme.custom.motion.duration.slow}ms ${theme.custom.motion.easing.standard}`,
        ...entrance(fadeDown, { duration: 400 }),
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          variant="regular"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            borderRadius: `${theme.custom.radii.pill}px`,
            bgcolor: alpha(
              theme.palette.background.paper,
              scrolled ? 0.9 : theme.custom.appBar.bgOpacity
            ),
            backdropFilter: `blur(${theme.custom.appBar.blur}px)`,
            border: "1px solid",
            borderColor: theme.palette.divider,
            boxShadow: scrolled ? theme.custom.shadows.md : "none",
            transition: `background-color ${theme.custom.motion.duration.slow}ms ${theme.custom.motion.easing.standard}, box-shadow ${theme.custom.motion.duration.slow}ms ${theme.custom.motion.easing.standard}`,
            minHeight: { xs: 54, md: 58 },
            px: { xs: 2, md: 2.5 },
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              px: 0,
            }}
          >
            <Box
              component="img"
              src={OpenLAPLogo}
              style={logoStyle}
              alt="logo of OpenLAP"
              role="button"
              tabIndex={0}
              aria-label="OpenLAP, back to top"
              sx={{ mr: 2 }}
              onClick={() => handleNav(navigationIds.HERO)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNav(navigationIds.HERO);
                }
              }}
            />
            <Box sx={{ display: { xs: "none", md: "flex" } }}>
              {navigationItems.map((item) => (
                <MenuItem
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  sx={{ py: 1, px: 1.5, borderRadius: 2 }}
                >
                  <Typography variant="body2" color="text.primary">
                    {item.name}
                  </Typography>
                </MenuItem>
              ))}
            </Box>
          </Box>
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              gap: 1,
              alignItems: "center",
            }}
          >
            <ToggleColorMode />
            <Button
              color="primary"
              variant="text"
              size="small"
              onClick={() => navigate("/login")}
            >
              Sign in
            </Button>
            <Button
              color="primary"
              variant="contained"
              size="small"
              onClick={() => navigate("/register")}
            >
              Sign up
            </Button>
          </Box>
          <Box sx={{ display: { sm: "", md: "none" } }}>
            <Button
              variant="text"
              color="primary"
              aria-label="menu"
              onClick={toggleDrawer(true)}
              sx={{ minWidth: "30px", p: "4px" }}
            >
              <MenuIcon />
            </Button>
            <Drawer anchor="right" open={open} onClose={toggleDrawer(false)}>
              <Box
                sx={{
                  minWidth: "60dvw",
                  p: 2,
                  backgroundColor: "background.paper",
                  flexGrow: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "end",
                    flexGrow: 1,
                  }}
                >
                  <ToggleColorMode />
                </Box>
                {navigationItems.map((item) => (
                  <MenuItem key={item.id} onClick={() => handleNav(item.id)}>
                    {item.name}
                  </MenuItem>
                ))}
                <Divider />
                <MenuItem>
                  <Button
                    color="primary"
                    variant="contained"
                    onClick={() => navigate("/register")}
                    sx={{ width: "100%" }}
                  >
                    Sign up
                  </Button>
                </MenuItem>
                <MenuItem>
                  <Button
                    color="primary"
                    variant="outlined"
                    onClick={() => navigate("/login")}
                    sx={{ width: "100%" }}
                  >
                    Sign in
                  </Button>
                </MenuItem>
              </Box>
            </Drawer>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default AppAppBar;
