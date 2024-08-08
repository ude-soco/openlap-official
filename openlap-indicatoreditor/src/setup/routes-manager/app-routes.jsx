import { useContext, useState } from "react";
import { CssBaseline, Paper } from "@mui/material";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth-context-manager/auth-context-manager.jsx";
import PrivateRoute from "./private-routes";
import UserProfile from "../../pages/account-manager/user-profile";
import Login from "../../pages/login/login";
import Register from "../../pages/register/register";
import RoleTypes from "../../common/enums/role-types.js";
import IndicatorEditor from "../../pages/indicator-editor/indicator-editor.jsx";
import { ThemeProvider } from "@mui/material/styles";
import { CustomThemeContext } from "../theme-manager/theme-context-manager.jsx";
import { AuthContext } from "../auth-context-manager/auth-context-manager.jsx";
import NavBar from "../../common/components/nav-bar/nav-bar.jsx";
import Sidebar from "../../common/components/side-bar/side-bar.jsx";

const AppRoutes = () => {
  const { darkMode, themeDark, themeLight } = useContext(CustomThemeContext);
  const { user } = useContext(AuthContext);
  const [openSidebar, setOpenSidebar] = useState(true);
  const toggleSidebar = () => {
    setOpenSidebar((prevState) => !prevState);
  };
  return (
    <>
      <ThemeProvider theme={darkMode ? themeDark : themeLight}>
        <CssBaseline />
        <Paper>
          <Router>
            {Boolean(user) && (
              <NavBar openSidebar={openSidebar} toggleSidebar={toggleSidebar} />
            )}
            {Boolean(user) && <Sidebar openSidebar={openSidebar} />}
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <PrivateRoute
                    component={<UserProfile />}
                    allowedRoles={[
                      RoleTypes.user,
                      RoleTypes["data provider"],
                      RoleTypes.admin,
                    ]}
                  />
                }
              />
              <Route
                path="/indicator"
                element={
                  <PrivateRoute
                    component={<IndicatorEditor />}
                    allowedRoles={[RoleTypes.user]}
                  />
                }
              />
            </Routes>
          </Router>
        </Paper>
      </ThemeProvider>
    </>
  );
};

export default AppRoutes;
