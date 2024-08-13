import {useContext, useEffect, useState} from "react";
import {Box, CssBaseline, Grid, Paper} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";
import {styled, ThemeProvider, useTheme} from "@mui/material/styles";
import PrivateRoute from "./private-routes";
import UserProfile from "../../pages/account-manager/user-profile";
import Login from "../../pages/login/login";
import Register from "../../pages/register/register";
import RoleTypes from "../../common/enums/role-types.js";
import {CustomThemeContext} from "../theme-manager/theme-context-manager.jsx";
import {AuthContext} from "../auth-context-manager/auth-context-manager.jsx";
import NavBar from "../../common/components/nav-bar/nav-bar.jsx";
import Sidebar, {DrawerHeader} from "../../common/components/side-bar/side-bar.jsx";
import IndicatorEditorDashboard from "../../pages/indicator-editor/dashboard/indicator-editor-dashboard.jsx";
import IndicatorPool from "../../pages/indicator-editor/indicator-pool/indicator-pool.jsx";
import IndicatorEditor from "../../pages/indicator-editor/editor/indicator-editor.jsx";
import ISCCreator from "../../pages/isc-creator/creator/isc-creator.jsx";
import ISCDashboard from "../../pages/isc-creator/dashboard/isc-dashboard.jsx";
import ISCPool from "../../pages/isc-creator/isc-pool/isc-pool.jsx";
import GQIDashboard from "../../pages/gqi-editor/dashboard/gqi-dashboard.jsx";
import GQIEditor from "../../pages/gqi-editor/gqi-editor/gqi-editor.jsx";
import GQIPool from "../../pages/gqi-editor/gqi-pool/gqi-pool.jsx";
import Footer from "../../common/components/footer/footer.jsx";
import {SnackbarProvider} from "notistack";
import IndicatorPreview from "../../pages/indicator-editor/dashboard/indicator-preview.jsx";
import BasicIndicator from "../../pages/indicator-editor/editor/components/basic-indicator/basic-indicator.jsx";
import CompositeIndicator from "../../pages/indicator-editor/editor/components/composite-indicator/composite-indicator.jsx";
import MultiLevelAnalysisIndicator
  from "../../pages/indicator-editor/editor/components/multi-level-analysis-indicator/multi-level-analysis-indicator.jsx";

const drawerWidth = 280;

const Main = styled("main", {shouldForwardProp: (prop) => prop !== "open"})(({theme, open}) => ({
  flexGrow: 1, transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.leavingScreen,
  }), marginLeft: `-${drawerWidth}px`, ...(open && {
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut, duration: theme.transitions.duration.enteringScreen,
    }), marginLeft: 0,
  }),
}));

const AppRoutes = () => {
  const {darkMode, themeDark, themeLight} = useContext(CustomThemeContext);
  const {user} = useContext(AuthContext);
  const [openSidebar, setOpenSidebar] = useState(true);
  const theme = useTheme();
  const isMatch = useMediaQuery(theme.breakpoints.down("lg"));

  useEffect(() => {
    if (isMatch && openSidebar) {
      setOpenSidebar(false);
    }
  }, [isMatch]);

  const toggleSidebar = () => {
    setOpenSidebar((prevState) => !prevState);
  };
  return (<>
    <ThemeProvider theme={darkMode ? themeDark : themeLight}>
      <SnackbarProvider maxSnack={3}>
        <CssBaseline/>
        <Router>
          <Box sx={{display: "flex"}}>
            {Boolean(user) && (<NavBar
              openSidebar={openSidebar}
              toggleSidebar={toggleSidebar}
            />)}
            {Boolean(user) && <Sidebar openSidebar={openSidebar}/>}
            <Grid container justifyContent="center">
              <Main
                open={openSidebar}
                sx={{maxWidth: "1920px", width: "100%"}}
              >
                <DrawerHeader/>
                <Paper
                  elevation={0}
                  sx={{
                    minHeight: "100vh", p: 2, width: "100%",
                  }}
                >
                  <Routes>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/register" element={<Register/>}/>
                    <Route
                      path="/"
                      element={<PrivateRoute
                        component={<UserProfile/>}
                        allowedRoles={[RoleTypes.user, RoleTypes["data provider"], RoleTypes.admin,]}
                      />}
                    />
                    <Route path="/indicator">
                      <Route
                        index
                        element={<PrivateRoute
                          component={<IndicatorEditorDashboard/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                      <Route
                        path="editor"
                        element={<PrivateRoute
                          component={<IndicatorEditor/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                      <Route
                        path="editor/basic"
                        element={<PrivateRoute
                          component={<BasicIndicator/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                      <Route
                        path="editor/composite"
                        element={<PrivateRoute
                          component={<CompositeIndicator/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                      <Route
                        path="editor/multi-level-analysis"
                        element={<PrivateRoute
                          component={<MultiLevelAnalysisIndicator/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                      <Route
                        path=":id"
                        element={<PrivateRoute
                          component={<IndicatorPreview/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                      <Route
                        path="pool"
                        element={<PrivateRoute
                          component={<IndicatorPool/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                    </Route>
                    <Route path="/isc">
                      <Route
                        index
                        element={<PrivateRoute
                          component={<ISCDashboard/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                      <Route
                        path="creator"
                        element={<PrivateRoute
                          component={<ISCCreator/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                      <Route
                        path="pool"
                        element={<PrivateRoute
                          component={<ISCPool/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                    </Route>

                    <Route path="/gqi">
                      <Route
                        index
                        element={<PrivateRoute
                          component={<GQIDashboard/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                      <Route
                        path="editor"
                        element={<PrivateRoute
                          component={<GQIEditor/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                      <Route
                        path="pool"
                        element={<PrivateRoute
                          component={<GQIPool/>}
                          allowedRoles={[RoleTypes.user]}
                        />}
                      />
                    </Route>
                  </Routes>
                </Paper>
                <Footer/>
              </Main>
            </Grid>
          </Box>
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  </>);
};

export default AppRoutes;
