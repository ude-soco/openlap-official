import { useState } from "react";
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
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import menus from "../../../setup/routes-manager/router-config.jsx";

const drawerWidth = 280;
export const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "center",
}));

const Sidebar = ({ openSidebar }) => {
  const [openMenus, setOpenMenus] = useState({
    isc: true,
    indicator: true,
    gqi: true,
    tools: true,
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

  const MenuList = ({ menu }) => (
    <List>
      <ListItemButton onClick={() => handleToggle(menu.key)}>
        <ListItemIcon>{menu.icon}</ListItemIcon>
        <ListItemText primary={menu.title} />
        {openMenus[menu.key] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItemButton>
      <Collapse in={openMenus[menu.key]} timeout={"auto"} unmountOnExit>
        <List component="div" disablePadding>
          {menu.items.map((item, index) => (
            <ListItemButton
              sx={{ pl: 4 }}
              onClick={() => navigate(item.navigate)}
              key={index}
              selected={location.pathname === item.navigate}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.primary} secondary={item.secondary} />
            </ListItemButton>
          ))}
        </List>
      </Collapse>
    </List>
  );

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
          onClick={() => navigate("/indicator")}
          src={OpenLAPLogo}
          alt="Soco logo"
        />
      </DrawerHeader>

      <Divider />

      {menus.map((menu) => (
        <MenuList menu={menu} key={menu.key} />
      ))}
    </Drawer>
  );
};

export default Sidebar;
