import AppRoutes from "./setup/routes-manager/app-routes.jsx";
import { CustomThemeProvider } from "./setup/theme-manager/theme-context-manager.jsx";
import { AuthProvider } from "./setup/auth-context-manager/auth-context-manager.jsx";
import { BrowserRouter as Router } from "react-router-dom";

const AppOpenlap = () => {
  return (
    <CustomThemeProvider>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </CustomThemeProvider>
  );
};

export default AppOpenlap;
