import { useContext, useState } from "react";
import PropTypes from "prop-types";
import {
  AppBar,
  Box,
  FormControlLabel,
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
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";

const AppTopBar = ({ drawerWidth, onMenuToggle }) => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const { darkMode, toggleDarkMode, handleLightMode } =
    useContext(CustomThemeContext);
  const { enqueueSnackbar } = useSnackbar();
  const [menu, setMenu] = useState(null);

  const handleSignOut = () => {
    logout();
    handleLightMode();
    enqueueSnackbar("Logout successful!", { variant: "success" });
  };

  return (
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
          aria-label="Open navigation menu"
          onClick={onMenuToggle}
          sx={{ mr: 2, display: { md: "none" } }}
        >
          <MenuIcon />
        </IconButton>
        <Box
          component="img"
          sx={{ height: 40, cursor: "pointer", display: { md: "none" } }}
          onClick={() => navigate("/dashboard")}
          src={OpenLAPLogo}
          alt="OpenLAP"
        />
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          color="primary"
          aria-label="Settings and account"
          aria-haspopup="true"
          aria-expanded={Boolean(menu)}
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
            <FormControlLabel
              labelPlacement="start"
              sx={{ ml: 0, mr: 0, width: "100%", justifyContent: "space-between" }}
              control={
                <Switch checked={darkMode} onChange={toggleDarkMode} />
              }
              label="Dark mode"
            />
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
  );
};

AppTopBar.propTypes = {
  drawerWidth: PropTypes.number.isRequired,
  onMenuToggle: PropTypes.func.isRequired,
};

export default AppTopBar;
