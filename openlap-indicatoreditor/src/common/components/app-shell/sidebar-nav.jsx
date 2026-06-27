import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LockIcon from "@mui/icons-material/Lock";
import {
  Box,
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import menus from "../../../setup/routes-manager/router-config.jsx";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "center",
}));

// Initial open/closed state is derived from `defaultOpen` in the nav config so
// there are no hardcoded menu keys to keep in sync (a single source of truth).
const buildInitialOpenState = () =>
  menus.reduce(
    (acc, menu) => ({ ...acc, [menu.key]: menu.defaultOpen ?? true }),
    {}
  );

const SidebarNav = ({ onItemClick }) => {
  const {
    user: { roles },
  } = useContext(AuthContext);
  const [openMenus, setOpenMenus] = useState(buildInitialOpenState);

  const navigate = useNavigate();
  const location = useLocation();

  // Open the groups the user can access, collapse the ones locked for their
  // role. Uses a functional update so `openMenus` need not be a dependency.
  useEffect(() => {
    setOpenMenus((prev) => {
      const next = { ...prev };
      menus.forEach((menu) => {
        const disabled = roles.some((role) =>
          menu.disabledRoles.includes(role)
        );
        next[menu.key] = !disabled;
      });
      return next;
    });
  }, [roles]);

  const handleToggle = (menuKey) => {
    setOpenMenus((p) => ({ ...p, [menuKey]: !p[menuKey] }));
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (onItemClick) onItemClick();
  };

  const renderMenu = (menu) => {
    if (!roles.some((role) => menu.allowedRoles.includes(role))) {
      return null;
    }
    const disabled = roles.some((role) => menu.disabledRoles.includes(role));
    return (
      <Tooltip
        key={menu.key}
        arrow
        placement="right"
        title={
          disabled ? (
            <>
              <Typography variant="body2" gutterBottom>
                &quot;{menu.title}&quot; option is locked.
              </Typography>
              <Typography variant="body2">
                To unlock, go to &quot;Manage LRS&quot; under &quot;Settings&quot;
                to add an LRS to your account.
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
            <ListItemIcon>{disabled ? <LockIcon /> : menu.icon}</ListItemIcon>
            <ListItemText primary={menu.title} />
            {openMenus[menu.key] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={openMenus[menu.key]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {menu.items.map((item) => {
                const active = location.pathname === item.navigate;
                return (
                  <ListItemButton
                    key={item.navigate}
                    sx={{ pl: 4 }}
                    onClick={() => handleNavigate(item.navigate)}
                    disabled={disabled}
                    selected={active}
                    aria-current={active ? "page" : undefined}
                  >
                    <ListItemIcon>
                      {disabled ? <LockIcon /> : item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.primary}
                      secondary={item.secondary}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </List>
      </Tooltip>
    );
  };

  const dashboardActive = location.pathname === "/dashboard";

  return (
    <div>
      <DrawerHeader>
        <Box
          component="img"
          sx={{ height: 40, cursor: "pointer" }}
          onClick={() => handleNavigate("/dashboard")}
          src={OpenLAPLogo}
          alt="OpenLAP"
        />
      </DrawerHeader>

      <Divider />
      <List component="div" disablePadding>
        <ListItemButton
          onClick={() => handleNavigate("/dashboard")}
          selected={dashboardActive}
          aria-current={dashboardActive ? "page" : undefined}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Home" />
        </ListItemButton>
      </List>
      {menus.map((menu) => renderMenu(menu))}
    </div>
  );
};

SidebarNav.propTypes = {
  onItemClick: PropTypes.func,
};

export default SidebarNav;
