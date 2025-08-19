import AppRoutes from "./setup/routes-manager/app-routes";
import { CustomThemeProvider } from "./setup/theme-manager/theme-context-manager";
import { AuthProvider } from "./setup/auth-context-manager/auth-context-manager";
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
