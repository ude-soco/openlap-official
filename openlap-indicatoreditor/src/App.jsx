import AppRoutes from "./setup/routes-manager/app-routes.jsx";
import { CustomThemeProvider } from "./setup/theme-manager/theme-context-manager.jsx";
import { AuthProvider } from "./setup/auth-context-manager/auth-context-manager.jsx";

const App = () => {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </CustomThemeProvider>
  );
};

export default App;
