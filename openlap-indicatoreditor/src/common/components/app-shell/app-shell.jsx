import { useContext, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Box, CssBaseline, Drawer, Toolbar } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";
import { createAppTheme } from "../../theme/app-theme";
import AppTopBar from "./app-top-bar";
import SidebarNav from "./sidebar-nav";

const DRAWER_WIDTH = 280;

/**
 * Authenticated application shell: fixed top bar, responsive navigation drawer
 * (permanent on desktop, temporary on mobile) and a main content slot.
 *
 * Wraps its subtree in a nested, scoped authenticated theme so the shell and
 * page content get the modern design foundation without altering the global
 * theme or the public pages.
 */
const AppShell = ({ window, children }) => {
  const { theme } = useContext(CustomThemeContext);
  const appTheme = useMemo(() => createAppTheme(theme), [theme]);

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

  const drawerPaperSx = {
    boxSizing: "border-box",
    width: DRAWER_WIDTH,
    borderRight: (t) => `1px solid ${t.palette.divider}`,
    backgroundImage: "none",
  };

  return (
    <ThemeProvider theme={appTheme}>
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
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
              "& .MuiDrawer-paper": drawerPaperSx,
            }}
          >
            {/* Tapping a nav item on mobile should also dismiss the drawer. */}
            <SidebarNav onItemClick={handleDrawerClose} />
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: "none", md: "block" },
              "& .MuiDrawer-paper": drawerPaperSx,
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
    </ThemeProvider>
  );
};

AppShell.propTypes = {
  window: PropTypes.func,
  children: PropTypes.node,
};

export default AppShell;
