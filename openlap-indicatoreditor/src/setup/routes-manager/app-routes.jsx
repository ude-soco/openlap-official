import { useContext } from "react";
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

const AppRoutes = () => {
  const { darkMode, themeDark, themeLight } = useContext(CustomThemeContext);
  return (
    <>
      <ThemeProvider theme={darkMode ? themeDark : themeLight}>
        <CssBaseline />
        <AuthProvider>
          <Paper>
            <Router>
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
        </AuthProvider>
      </ThemeProvider>
    </>
  );
};

export default AppRoutes;
