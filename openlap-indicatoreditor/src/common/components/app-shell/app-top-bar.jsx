import { useContext, useState } from "react";
import PropTypes from "prop-types";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  FormControlLabel,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Switch,
  Toolbar,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";

const AppTopBar = ({ drawerWidth, onMenuToggle }) => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { darkMode, toggleDarkMode, handleLightMode } =
    useContext(CustomThemeContext);
  const { enqueueSnackbar } = useSnackbar();
  const [menu, setMenu] = useState(null);

  // Identity is read straight from the decoded JWT already in context — no new
  // API call. `sub` is the user's email for OpenLAP tokens.
  const identity = user?.sub || user?.email || user?.name || "";
  const initial = identity ? identity.trim().charAt(0).toUpperCase() : "";

  const handleSignOut = () => {
    setMenu(null);
    logout();
    handleLightMode();
    enqueueSnackbar("Logout successful!", { variant: "success" });
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      color="default"
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        color: "text.primary",
        backgroundColor: (theme) =>
          alpha(theme.palette.background.paper, darkMode ? 0.7 : 0.8),
        backdropFilter: "blur(12px)",
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="Open navigation menu"
          onClick={onMenuToggle}
          sx={{ display: { md: "none" } }}
        >
          <MenuIcon />
        </IconButton>
        <Box
          component="img"
          sx={{ height: 36, cursor: "pointer", display: { md: "none" } }}
          onClick={() => navigate("/dashboard")}
          src={OpenLAPLogo}
          alt="OpenLAP"
        />
        <Box sx={{ flexGrow: 1 }} />
        {identity && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" }, maxWidth: 220 }}
            noWrap
          >
            {identity}
          </Typography>
        )}
        <IconButton
          aria-label="Account and settings"
          aria-haspopup="true"
          aria-expanded={Boolean(menu)}
          onClick={(event) => setMenu(event.currentTarget)}
          sx={{ p: 0.5 }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              fontSize: 15,
              fontWeight: 600,
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            {initial || <PersonIcon fontSize="small" />}
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={menu}
          open={Boolean(menu)}
          onClose={() => setMenu(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { mt: 1, minWidth: 240 } } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2">Account</Typography>
            {identity && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {identity}
              </Typography>
            )}
          </Box>
          <Divider />
          <Box sx={{ px: 2, py: 0.5 }}>
            <FormControlLabel
              labelPlacement="start"
              sx={{
                ml: 0,
                mr: 0,
                width: "100%",
                justifyContent: "space-between",
              }}
              control={
                <Switch checked={darkMode} onChange={toggleDarkMode} />
              }
              label="Dark mode"
            />
          </Box>
          <Divider />
          <MenuItem sx={{ py: 1.25 }} onClick={handleSignOut}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>Sign out</ListItemText>
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
