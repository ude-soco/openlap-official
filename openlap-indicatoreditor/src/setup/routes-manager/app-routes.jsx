import { lazy, Suspense, useContext } from "react";
import {
  Box,
  CircularProgress,
  CssBaseline,
  Paper,
  Stack,
  Divider,
  Container,
} from "@mui/material";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import PrivateRoute from "./private-routes";
import RoleTypes from "../../pages/account-manager/utils/enums/role-types.js";
import { CustomThemeContext } from "../theme-manager/theme-context-manager";
import { AuthContext } from "../auth-context-manager/auth-context-manager";
import Footer from "../../common/components/footer/footer";
import { SnackbarProvider } from "notistack";
import AppShell from "../../common/components/app-shell/app-shell";
import LandingPage from "../../pages/landing-page/landing-page.jsx";

// Route components are code-split so anonymous landing-page visitors don't
// download the authenticated app (charts, data grid, CSV parsing, etc.).
// Only the public LandingPage entry is eager.
const Login = lazy(() => import("../../pages/login/login"));
const Register = lazy(() => import("../../pages/register/register"));
const PrivacyPolicy = lazy(() =>
  import("../../pages/privacy-policy/privacy-policy.jsx")
);
const UserProfile = lazy(() =>
  import("../../pages/account-manager/user-profile")
);
const IndicatorEditorDashboard = lazy(() =>
  import("../../pages/indicators/dashboard/indicator-editor-dashboard")
);
const IndicatorPool = lazy(() =>
  import("../../pages/indicators/indicator-pool/indicator-pool")
);
const ISCPool = lazy(() =>
  import("../../pages/indicator-specification-cards/isc-pool/isc-pool")
);
const GQIDashboard = lazy(() =>
  import("../../pages/gqi-editor/dashboard/gqi-dashboard")
);
const GQIEditor = lazy(() =>
  import("../../pages/gqi-editor/gqi-editor/gqi-editor")
);
const GQIPool = lazy(() => import("../../pages/gqi-editor/gqi-pool/gqi-pool"));
const IndicatorPreview = lazy(() =>
  import("../../pages/indicators/dashboard/components/indicator-preview")
);
const CompositeIndicator = lazy(() =>
  import(
    "../../pages/indicators/indicator-editor/composite-indicator/composite-indicator"
  )
);
const CsvXapiDashboard = lazy(() =>
  import("../../pages/csv-xapi-converter/csv-xapi-dashboard")
);
const ManageLrs = lazy(() => import("../../pages/account-manager/manage-lrs"));
const Home = lazy(() => import("../../pages/home/home"));
const IndicatorSpecificationCard = lazy(() =>
  import(
    "../../pages/indicator-specification-cards/creator/indicator-specification-card"
  )
);
const IscDashboard = lazy(() =>
  import("../../pages/indicator-specification-cards/dashboard/isc-dashboard")
);
const IscPreview = lazy(() =>
  import(
    "../../pages/indicator-specification-cards/dashboard/components/isc-preview"
  )
);
const IndicatorEditor = lazy(() =>
  import("../../pages/indicators/indicator-editor/indicator-editor")
);
const BasicIndicator = lazy(() =>
  import(
    "../../pages/indicators/indicator-editor/basic-indicator/basic-indicator"
  )
);
const ManageVisualization = lazy(() =>
  import("../../pages/admin/manage-visualization.jsx")
);
const ManageAnalytics = lazy(() =>
  import("../../pages/admin/manage-analytics.jsx")
);

const RouteFallback = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "60vh",
    }}
  >
    <CircularProgress />
  </Box>
);

const AppRoutes = () => {
  const { theme } = useContext(CustomThemeContext);
  const { user } = useContext(AuthContext);

  return (
    <>
      <ThemeProvider theme={theme}>
        <SnackbarProvider maxSnack={3}>
          <CssBaseline />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
            {/* Public routes */}
            {!user && (
              <>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
            {/* Private routes (with navigation) */}
            {user && (
              <Route
                element={
                  <AppShell>
                    <Container maxWidth="xl" sx={{ minHeight: "89vh" }}>
                      <Stack
                        component={Paper}
                        elevation={0}
                        gap={1}
                        sx={{
                          p: { xs: 2, md: 3 },
                          borderRadius: (t) => `${t.custom.radii.card}px`,
                          border: (t) => `1px solid ${t.palette.divider}`,
                          bgcolor: "background.paper",
                        }}
                      >
                        <Outlet />
                      </Stack>
                    </Container>
                    <Stack gap={2} sx={{ pt: 4 }}>
                      <Divider />
                      <Footer />
                    </Stack>
                  </AppShell>
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
                        RoleTypes.admin,
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
                        RoleTypes.admin,
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
                  {/* <Route
                    path="multi-level-analysis"
                    element={
                      <PrivateRoute
                        component={<MultiLevelAnalysisIndicator />}
                        allowedRoles={[RoleTypes.user]}
                      />
                    }
                  /> */}
                  {/* <Route
                    path="multi-level-analysis/edit/:id"
                    element={
                      <PrivateRoute
                        component={<MultiLevelAnalysisIndicator />}
                        allowedRoles={[RoleTypes.user]}
                      />
                    }
                  /> */}
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
                  path="/manage-analytics"
                  element={
                    <PrivateRoute
                      component={<ManageAnalytics />}
                      allowedRoles={[RoleTypes.admin]}
                    />
                  }
                />
                <Route
                  path="/manage-visualization"
                  element={
                    <PrivateRoute
                      component={<ManageVisualization />}
                      allowedRoles={[RoleTypes.admin]}
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
          </Suspense>
        </SnackbarProvider>
      </ThemeProvider>
    </>
  );
};

export default AppRoutes;
