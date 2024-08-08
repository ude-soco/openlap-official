import {
  AppBar,
  Grid,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Switch,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import { useContext, useState } from "react";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager.jsx";

const NavBar = ({ message, moveTo, buttonLabel }) => {
  const { logout } = useContext(AuthContext);
  const { darkMode, toggleDarkMode } = useContext(CustomThemeContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [menu, setMenu] = useState(null);
  return (
    <>
      <AppBar position="fixed" elevation={1} open={open} color="inherit">
        <Toolbar>
          <Tooltip title="Open sidebar">
            <IconButton color="primary">
              <MenuIcon />
            </IconButton>
          </Tooltip>

          <Grid container justifyContent="space-between" alignItems="center">
            <Grid
              item
              component="img"
              sx={{ height: 35, cursor: "pointer" }}
              src={OpenLAPLogo}
              alt="Soco logo"
              onClick={() => navigate("/indicator")}
            />

            <Tooltip title={<Typography>Open settings</Typography>}>
              <IconButton
                color="primary"
                onClick={(event) => setMenu(event.currentTarget)}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={menu}
              open={Boolean(menu)}
              onClose={() => setMenu(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem sx={{ py: 1.5 }}>
                <ListItemText sx={{ pr: 2 }}>Account Settings</ListItemText>
                <ListItemIcon>
                  <PersonIcon color="primary" />
                </ListItemIcon>
              </MenuItem>
              <ListItem divider>
                <ListItemText sx={{ mr: 6 }}>Dark Mode</ListItemText>
                <Switch checked={darkMode} onChange={toggleDarkMode} />
              </ListItem>

              <MenuItem sx={{ py: 1.5 }} onClick={logout}>
                <ListItemText>Sign out</ListItemText>
                <ListItemIcon>
                  <LogoutIcon color="primary" />
                </ListItemIcon>
              </MenuItem>
            </Menu>
          </Grid>
        </Toolbar>
      </AppBar>
    </>
  );
};

export default NavBar;
