import { useContext, useEffect, useState } from "react";
import { Box, CssBaseline, Grid, Paper } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Navigate, Route, Routes } from "react-router-dom";
import { styled, ThemeProvider, useTheme } from "@mui/material/styles";
import PrivateRoute from "./private-routes";
import UserProfile from "../../pages/account-manager/user-profile";
import Login from "../../pages/login/login";
import Register from "../../pages/register/register";
import RoleTypes from "../../pages/account-manager/utils/enums/role-types.js";
import { CustomThemeContext } from "../theme-manager/theme-context-manager.jsx";
import { AuthContext } from "../auth-context-manager/auth-context-manager.jsx";
import NavBar from "../../common/components/nav-bar/nav-bar.jsx";
import Sidebar, {
  DrawerHeader,
} from "../../common/components/side-bar/side-bar.jsx";
import IndicatorEditorDashboard from "../../pages/indicator-editor/dashboard/indicator-editor-dashboard.jsx";
import IndicatorPool from "../../pages/indicator-editor/indicator-pool/indicator-pool.jsx";
import IndicatorEditor from "../../pages/indicator-editor/editor/indicator-editor.jsx";
import ISCCreator from "../../pages/isc-creator/creator/isc-creator.jsx";
import ISCPool from "../../pages/isc-creator/isc-pool/isc-pool.jsx";
import GQIDashboard from "../../pages/gqi-editor/dashboard/gqi-dashboard.jsx";
import GQIEditor from "../../pages/gqi-editor/gqi-editor/gqi-editor.jsx";
import GQIPool from "../../pages/gqi-editor/gqi-pool/gqi-pool.jsx";
import Footer from "../../common/components/footer/footer.jsx";
import { SnackbarProvider } from "notistack";
import IndicatorPreview from "../../pages/indicator-editor/dashboard/components/indicator-preview.jsx";
import BasicIndicator from "../../pages/indicator-editor/editor/basic-indicator/basic-indicator.jsx";
import CompositeIndicator from "../../pages/indicator-editor/editor/composite-indicator/composite-indicator.jsx";
import MultiLevelAnalysisIndicator from "../../pages/indicator-editor/editor/multi-level-analysis-indicator/multi-level-analysis-indicator.jsx";
import CsvXapiDashboard from "../../pages/csv-xapi-converter/csv-xapi-dashboard.jsx";
import ManageLrs from "../../pages/account-manager/manage-lrs.jsx";
import Home from "../../pages/home/home.jsx";
import IndicatorSpecificationCard from "../../pages/indicator-specification-cards/creator/indicator-specification-card.jsx";
import IscDashboard from "../../pages/indicator-specification-cards/dashboard/isc-dashboard.jsx";
import IscPreview from "../../pages/indicator-specification-cards/dashboard/components/isc-preview.jsx";

const drawerWidth = 280;

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    flexGrow: 1,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create("margin", {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  })
);

const AppRoutes = () => {
  const { darkMode, themeDark, themeLight } = useContext(CustomThemeContext);
  const { user } = useContext(AuthContext);
  const [openSidebar, setOpenSidebar] = useState(true);
  const theme = useTheme();
  const isMatch = useMediaQuery(theme.breakpoints.down("lg"));

  useEffect(() => {
    if (isMatch && openSidebar && user) {
      setOpenSidebar(false);
    }
  }, [isMatch]);

  const toggleSidebar = () => {
    setOpenSidebar((prevState) => !prevState);
  };

  return (
    <>
      <ThemeProvider theme={darkMode ? themeDark : themeLight}>
        <SnackbarProvider maxSnack={3}>
          <CssBaseline />
          <Box sx={{ display: "flex" }}>
            {user && (
              <NavBar openSidebar={openSidebar} toggleSidebar={toggleSidebar} />
            )}
            {user ? <Sidebar openSidebar={openSidebar} /> : undefined}
            <Grid container justifyContent="center">
              <Main open={openSidebar} sx={{ maxWidth: 1900, width: "100%" }}>
                <DrawerHeader />
                <Paper
                  elevation={0}
                  sx={{
                    minHeight: "100vh",
                    p: 2,
                    width: "100%",
                  }}
                >
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    <Route
                      path="/account-settings"
                      element={
                        <PrivateRoute
                          component={<UserProfile />}
                          allowedRoles={[
                            RoleTypes.user,
                            RoleTypes.userWithoutLRS,
                            RoleTypes["data provider"],
                          ]}
                        />
                      }
                    />
                    <Route
                      path="/dashboard"
                      element={
                        <PrivateRoute
                          component={<Home />}
                          allowedRoles={[
                            RoleTypes.user,
                            RoleTypes.userWithoutLRS,
                            RoleTypes["data provider"],
                          ]}
                        />
                      }
                    />
                    <Route
                      path="/manage-lrs"
                      element={
                        <PrivateRoute
                          component={<ManageLrs />}
                          allowedRoles={[
                            RoleTypes.user,
                            RoleTypes.userWithoutLRS,
                            RoleTypes["data provider"],
                          ]}
                        />
                      }
                    />
                    <Route path="/indicator/editor">
                      <Route
                        index
                        element={
                          <PrivateRoute
                            component={<IndicatorEditor />}
                            allowedRoles={[RoleTypes.user]}
                          />
                        }
                      />
                      <Route
                        path="basic"
                        element={
                          <PrivateRoute
                            component={<BasicIndicator />}
                            allowedRoles={[RoleTypes.user]}
                          />
                        }
                      />
                      <Route
                        path="composite"
                        element={
                          <PrivateRoute
                            component={<CompositeIndicator />}
                            allowedRoles={[RoleTypes.user]}
                          />
                        }
                      />
                      <Route
                        path="multi-level-analysis"
                        element={
                          <PrivateRoute
                            component={<MultiLevelAnalysisIndicator />}
                            allowedRoles={[RoleTypes.user]}
                          />
                        }
                      />
                    </Route>
                    <Route path="/indicator">
                      <Route
                        index
                        element={
                          <PrivateRoute
                            component={<IndicatorEditorDashboard />}
                            allowedRoles={[RoleTypes.user]}
                          />
                        }
                      />
                      <Route
                        path=":id"
                        element={
                          <PrivateRoute
                            component={<IndicatorPreview />}
                            allowedRoles={[RoleTypes.user]}
                          />
                        }
                      />
                    </Route>
                    <Route
                      path="/indicator/pool"
                      element={
                        <PrivateRoute
                          component={<IndicatorPool />}
                          allowedRoles={[RoleTypes.user]}
                        />
                      }
                    />
                    <Route path="/isc">
                      <Route
                        index
                        element={
                          <PrivateRoute
                            component={<IscDashboard />}
                            allowedRoles={[
                              RoleTypes.user,
                              RoleTypes.userWithoutLRS,
                            ]}
                          />
                        }
                      />
                      <Route
                        path=":id"
                        element={
                          <PrivateRoute
                            component={<IscPreview />}
                            allowedRoles={[
                              RoleTypes.user,
                              RoleTypes.userWithoutLRS,
                            ]}
                          />
                        }
                      />
                    </Route>
                    <Route
                      path="/isc/creator/old"
                      element={
                        <PrivateRoute
                          component={<ISCCreator />}
                          allowedRoles={[
                            RoleTypes.user,
                            RoleTypes.userWithoutLRS,
                          ]}
                        />
                      }
                    />
                    <Route
                      path="/isc/creator"
                      element={
                        <PrivateRoute
                          component={<IndicatorSpecificationCard />}
                          allowedRoles={[
                            RoleTypes.user,
                            RoleTypes.userWithoutLRS,
                          ]}
                        />
                      }
                    />
                    <Route
                      path="/isc/pool"
                      element={
                        <PrivateRoute
                          component={<ISCPool />}
                          allowedRoles={[
                            RoleTypes.user,
                            RoleTypes.userWithoutLRS,
                          ]}
                        />
                      }
                    />

                    <Route
                      path="/gqi"
                      element={
                        <PrivateRoute
                          component={<GQIDashboard />}
                          allowedRoles={[RoleTypes.user]}
                        />
                      }
                    />
                    <Route
                      path="/gqi/editor"
                      element={
                        <PrivateRoute
                          component={<GQIEditor />}
                          allowedRoles={[RoleTypes.user]}
                        />
                      }
                    />
                    <Route
                      path="/gqi/pool"
                      element={
                        <PrivateRoute
                          component={<GQIPool />}
                          allowedRoles={[RoleTypes.user]}
                        />
                      }
                    />
                    <Route
                      path="/csv-xapi"
                      element={
                        <PrivateRoute
                          component={<CsvXapiDashboard />}
                          allowedRoles={[RoleTypes.user]}
                        />
                      }
                    />
                    {user ? (
                      <Route
                        path="*"
                        element={<Navigate to={"/dashboard"} replace />}
                      />
                    ) : (
                      <Route
                        path="*"
                        element={<Navigate to={"/login"} replace />}
                      />
                    )}
                  </Routes>
                </Paper>
                <Footer />
              </Main>
            </Grid>
          </Box>
        </SnackbarProvider>
      </ThemeProvider>
    </>
  );
};

export default AppRoutes;
