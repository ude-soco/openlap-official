import AppRoutes from "./setup/routes-manager/app-routes.jsx";
import { CustomThemeProvider } from "./setup/theme-manager/theme-context-manager.jsx";

const App = () => {
  return (
    <CustomThemeProvider>

        <AppRoutes />
    </CustomThemeProvider>
  );
};

export default App;
