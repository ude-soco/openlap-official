import { useContext } from "react";
import { CssBaseline, Paper } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import PrivateRoute from "./private-routes";
import UserProfile from "../../pages/account-manager/user-profile";
import Login from "../../pages/login/login";
import Register from "../../pages/register/register";
import RoleTypes from "../../pages/account-manager/utils/enums/role-types.js";
import { CustomThemeContext } from "../theme-manager/theme-context-manager";
import { AuthContext } from "../auth-context-manager/auth-context-manager";
import IndicatorEditorDashboard from "../../pages/indicators/dashboard/indicator-editor-dashboard";
import IndicatorPool from "../../pages/indicators/indicator-pool/indicator-pool";
import ISCPool from "../../pages/indicator-specification-cards/isc-pool/isc-pool";
import GQIDashboard from "../../pages/gqi-editor/dashboard/gqi-dashboard";
import GQIEditor from "../../pages/gqi-editor/gqi-editor/gqi-editor";
import GQIPool from "../../pages/gqi-editor/gqi-pool/gqi-pool";
import Footer from "../../common/components/footer/footer";
import { SnackbarProvider } from "notistack";
import IndicatorPreview from "../../pages/indicators/dashboard/components/indicator-preview";
import CompositeIndicator from "../../pages/indicators/indicator-editor/composite-indicator/composite-indicator";
import MultiLevelAnalysisIndicator from "../../pages/indicators/editor/multi-level-analysis-indicator/multi-level-analysis-indicator";
import CsvXapiDashboard from "../../pages/csv-xapi-converter/csv-xapi-dashboard";
import ManageLrs from "../../pages/account-manager/manage-lrs";
import Home from "../../pages/home/home";
import IndicatorSpecificationCard from "../../pages/indicator-specification-cards/creator/indicator-specification-card";
import IscDashboard from "../../pages/indicator-specification-cards/dashboard/isc-dashboard";
import IscPreview from "../../pages/indicator-specification-cards/dashboard/components/isc-preview";

import IndicatorEditor from "../../pages/indicators/indicator-editor/indicator-editor";
import BasicIndicator from "../../pages/indicators/indicator-editor/basic-indicator/basic-indicator";
import NavigationBar from "../../common/components/navigation-bar/navigation-bar";

const AppRoutes = () => {
  const { darkMode, themeDark, themeLight } = useContext(CustomThemeContext);
  const { user } = useContext(AuthContext);

  return (
    <>
      <ThemeProvider theme={darkMode ? themeDark : themeLight}>
        <SnackbarProvider maxSnack={3}>
          <CssBaseline />
          <Routes>
            {/* Public routes */}
            {!user && (
              <>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            )}
            {/* Private routes (with navigation) */}
            {user && (
              <Route
                element={
                  <NavigationBar>
                    <Grid
                      component={Paper}
                      elevation={0}
                      container
                      justifyContent="center"
                    >
                      <Grid size={{ xs: 12 }} sx={{ minHeight: "89vh" }}>
                        <Grid container justifyContent="center">
                          <Grid size={{ xs: 12, xl: 8 }}>
                            <Outlet />
                          </Grid>
                        </Grid>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Footer />
                      </Grid>
                    </Grid>
                  </NavigationBar>
                }
              >
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
                    path="basic/edit/:id"
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
                    path="composite/edit/:id"
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
                  <Route
                    path="multi-level-analysis/edit/:id"
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
                <Route path="/isc/creator">
                  <Route
                    index
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
                    path="edit/:id"
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
                </Route>
                <Route
                  path="/isc/pool"
                  element={
                    <PrivateRoute
                      component={<ISCPool />}
                      allowedRoles={[RoleTypes.user, RoleTypes.userWithoutLRS]}
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

                <Route
                  path="*"
                  element={<Navigate to={"/dashboard"} replace />}
                />
              </Route>
            )}
          </Routes>
        </SnackbarProvider>
      </ThemeProvider>
    </>
  );
};

export default AppRoutes;
