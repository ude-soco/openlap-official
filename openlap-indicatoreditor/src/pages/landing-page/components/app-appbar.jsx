import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ToggleColorMode from "../../../common/components/toggle-color-mode/toggle-color-mode";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import { useNavigate } from "react-router-dom";
import { navigationIds, navigationItems } from "../utils/navigation-data";
import { scrollToSection } from "../../../common/utils/scroll-to-section";

const logoStyle = {
  width: "120px",
  height: "auto",
  cursor: "pointer",
};

const AppAppBar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };

  const handleNav = (sectionId) => {
    scrollToSection(sectionId);
    setOpen(false);
  };

  return (
    <div>
      <AppBar
        position="fixed"
        sx={{
          boxShadow: 0,
          bgcolor: "transparent",
          backgroundImage: "none",
          mt: 2,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            variant="regular"
            sx={(theme) => ({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              borderRadius: "999px",
              bgcolor:
                theme.palette.mode === "light"
                  ? "rgba(255, 255, 255, 0.4)"
                  : "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(24px)",
              maxHeight: 40,
              border: "1px solid",
              borderColor: "divider",

              boxShadow:
                theme.palette.mode === "light"
                  ? `0 0 1px rgba(85, 166, 246, 0.1), 1px 1.5px 2px -1px rgba(85, 166, 246, 0.15), 4px 4px 12px -2.5px rgba(85, 166, 246, 0.15)`
                  : "0 0 1px rgba(2, 31, 59, 0.7), 1px 1.5px 2px -1px rgba(2, 31, 59, 0.65), 4px 4px 12px -2.5px rgba(2, 31, 59, 0.65)",
            })}
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
                    sx={{ py: 1, px: 1.5 }}
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
                gap: 0.5,
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
                    <MenuItem
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                    >
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
    </div>
  );
};

export default AppAppBar;
