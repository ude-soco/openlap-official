import React, { useContext, useState } from "react";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Switch,
  Toolbar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";
import SidePanel from "../side-panel/side-panel";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { useSnackbar } from "notistack";

const drawerWidth = 280;

function NavigationBar(props) {
  const { window, children } = props;
  const { logout } = useContext(AuthContext);
  const { darkMode, toggleDarkMode, handleLightMode } =
    useContext(CustomThemeContext);
  const { enqueueSnackbar } = useSnackbar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [menu, setMenu] = useState(null);

  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen);
    }
  };

  const handleSignOut = () => {
    logout();
    handleLightMode();
    enqueueSnackbar("Logout successful!", { variant: "success" });
  };

  const container =
    window !== undefined ? () => window().document.body : undefined;

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: darkMode ? undefined : "white",
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="primary"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Box
            component="img"
            sx={{
              height: 40,
              cursor: "pointer",
              display: { md: "none" },
            }}
            onClick={() => navigate("/dashboard")}
            src={OpenLAPLogo}
            alt="Soco logo"
          />
          <span style={{ flexGrow: 1 }}></span>
          <IconButton
            color="primary"
            onClick={(event) => setMenu(event.currentTarget)}
          >
            <SettingsIcon />
          </IconButton>

          <Menu
            anchorEl={menu}
            open={Boolean(menu)}
            onClose={() => setMenu(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <ListItem divider>
              <ListItemText sx={{ mr: 6 }}>Dark Mode</ListItemText>
              <Switch checked={darkMode} onChange={toggleDarkMode} />
            </ListItem>

            <MenuItem sx={{ py: 1.5 }} onClick={handleSignOut}>
              <ListItemText>Sign out</ListItemText>
              <ListItemIcon>
                <LogoutIcon color="primary" />
              </ListItemIcon>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          container={container}
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          <SidePanel />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          <SidePanel />
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default NavigationBar;
