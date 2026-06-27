import { useState } from "react";
import PropTypes from "prop-types";
import { Box, CssBaseline, Drawer, Toolbar } from "@mui/material";
import AppTopBar from "./app-top-bar";
import SidebarNav from "./sidebar-nav";

const DRAWER_WIDTH = 280;

/**
 * Authenticated application shell: fixed top bar, responsive navigation drawer
 * (permanent on desktop, temporary on mobile) and a main content slot.
 *
 * Drop-in replacement for the former `NavigationBar` wrapper — same layout and
 * dimensions, with the top bar and sidebar extracted into reusable pieces.
 */
const AppShell = ({ window, children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen((open) => !open);
    }
  };

  const container =
    window !== undefined ? () => window().document.body : undefined;

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppTopBar drawerWidth={DRAWER_WIDTH} onMenuToggle={handleDrawerToggle} />
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="Primary navigation"
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
              width: DRAWER_WIDTH,
            },
          }}
        >
          {/* Tapping a nav item on mobile should also dismiss the drawer. */}
          <SidebarNav onItemClick={handleDrawerClose} />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          <SidebarNav />
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

AppShell.propTypes = {
  window: PropTypes.func,
  children: PropTypes.node,
};

export default AppShell;
