import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./setup/app-context-manager/app-context-manager";
import PrivateRoute from "./setup/routes-manager";
import UserProfile from "./pages/account-manager/user-profile";
import Login from "./pages/login/login";
import Register from "./pages/register/register";
import RoleTypes from "./common/enums/role-types";

function App() {
  return (
    <>
      <AuthProvider>
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
          </Routes>
        </Router>
      </AuthProvider>
    </>
  );
}

export default App;
