import {
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
import MuiAppBar from "@mui/material/AppBar";
import { styled } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import LogoutIcon from "@mui/icons-material/Logout";
import { useContext, useState } from "react";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager.jsx";
import { useSnackbar } from "notistack";

const drawerWidth = 280;
const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const NavBar = ({ openSidebar, toggleSidebar }) => {
  const { logout } = useContext(AuthContext);
  const { darkMode, toggleDarkMode, handleLightMode } =
    useContext(CustomThemeContext);
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const handleSignOut = () => {
    logout();
    handleLightMode();
    enqueueSnackbar("Logout successful!", { variant: "success" });
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={1}
        open={openSidebar}
        sx={{ bgcolor: darkMode ? undefined : "white" }}
      >
        <Toolbar>
          <Tooltip
            title={
              <Typography variant="body2" sx={{ p: 1 }}>
                Open sidebar
              </Typography>
            }
          >
            <IconButton
              color="primary"
              sx={{ mr: 2, ...(openSidebar && { display: "none" }) }}
              onClick={toggleSidebar}
              edge="start"
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid
              item
              onClick={() => navigate("/dashboard")}
              sx={{
                cursor: "pointer",
                height: 40,
                ...(openSidebar && { display: "none" }),
              }}
              component="img"
              src={OpenLAPLogo}
              alt="Soco logo"
            />
            <Tooltip
              title={
                <Typography variant="body2" sx={{ p: 1 }}>
                  Hide sidebar
                </Typography>
              }
            >
              <IconButton
                onClick={toggleSidebar}
                color="primary"
                sx={{ ...(!openSidebar && { display: "none" }) }}
                edge="start"
              >
                <FirstPageIcon />
              </IconButton>
            </Tooltip>

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
          </Grid>
        </Toolbar>
      </AppBar>
    </>
  );
};

export default NavBar;
