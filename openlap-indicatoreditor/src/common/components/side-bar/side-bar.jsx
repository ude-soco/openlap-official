import { useContext, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Box,
  Collapse,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import menus from "../../../setup/routes-manager/router-config.jsx";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LockIcon from "@mui/icons-material/Lock";

const drawerWidth = 280;
export const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "center",
}));

const Sidebar = ({ openSidebar }) => {
  const {
    user: { roles },
  } = useContext(AuthContext);
  const [openMenus, setOpenMenus] = useState({
    isc: true,
    indicator: false,
    gqi: false,
    tools: false,
    settings: true,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const handleToggle = (menuKey) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const MenuList = ({ menu }) => {
    if (roles.some((role) => menu.allowedRoles.includes(role))) {
      let disabled = roles.some((role) => menu.disabledRoles.includes(role));
      return (
        <>
          <Tooltip
            arrow
            placement="right"
            title={
              disabled ? (
                <>
                  <Typography variant="body2" gutterBottom>
                    "{menu.title}" option is locked.
                  </Typography>
                  <Typography variant="body2">
                    To unlock, go to "Manage LRS" under "Settings" to add an LRS
                    to your account.
                  </Typography>
                </>
              ) : undefined
            }
          >
            <List>
              <ListItemButton
                onClick={() => handleToggle(menu.key)}
                disabled={disabled}
              >
                <ListItemIcon>
                  {disabled ? <LockIcon /> : menu.icon}
                </ListItemIcon>
                <ListItemText primary={menu.title} />
                {openMenus[menu.key] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse in={openMenus[menu.key]} timeout={"auto"} unmountOnExit>
                <List component="div" disablePadding>
                  {menu.items.map((item, index) => (
                    <ListItemButton
                      sx={{ pl: 4 }}
                      onClick={() => navigate(item.navigate)}
                      disabled={disabled}
                      key={index}
                      selected={location.pathname === item.navigate}
                    >
                      <ListItemIcon>
                        {disabled ? <LockIcon /> : item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.primary}
                        secondary={item.secondary}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </List>
          </Tooltip>
        </>
      );
    }
    return undefined;
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={openSidebar}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <DrawerHeader>
        <Box
          component="img"
          sx={{
            height: 40,
            cursor: "pointer",
            ...(!openSidebar && { display: "none" }),
          }}
          onClick={() => navigate("/dashboard")}
          src={OpenLAPLogo}
          alt="Soco logo"
        />
      </DrawerHeader>

      <Divider sx={{ mb: 1 }} />
      <List component="div" disablePadding>
        <ListItemButton
          onClick={() => navigate("/dashboard")}
          selected={location.pathname === "/dashboard"}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Home" />
        </ListItemButton>
      </List>
      {menus.map((menu) => (
        <MenuList menu={menu} key={menu.key} />
      ))}
    </Drawer>
  );
};

export default Sidebar;
