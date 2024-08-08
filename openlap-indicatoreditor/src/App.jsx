import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./setup/app-context-manager/app-context-manager";
import PrivateRoute from "./setup/routes-manager";
import UserProfile from "./pages/account-manager/user-profile";
import SignIn from "./pages/sign-in/sign-in";
import SignUp from "./pages/sign-up/sign-up";

function App() {
  return (
    <>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              path="/"
              element={<PrivateRoute component={UserProfile} />}
            />
          </Routes>
        </Router>
      </AuthProvider>
    </>
  );
}

export default App;
