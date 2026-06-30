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
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import PrivateRoute from "./private-routes";
import RoleTypes from "../../pages/account-manager/utils/enums/role-types.js";
import { CustomThemeContext } from "../theme-manager/theme-context-manager";
import { AuthContext } from "../auth-context-manager/auth-context-manager";
import Footer from "../../common/components/footer/footer";
import { SnackbarProvider } from "notistack";
import AppShell from "../../common/components/app-shell/app-shell";
import { NavigationGuardProvider } from "./navigation-guard.jsx";
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
// Route-authoritative lifecycle entry points (Phase 3).
const IscNewRoute = lazy(() =>
  import("../../pages/indicator-specification-cards/creator/isc-route-loaders").then(
    (m) => ({ default: m.IscNewRoute })
  )
);
const IscDraftLoader = lazy(() =>
  import("../../pages/indicator-specification-cards/creator/isc-route-loaders").then(
    (m) => ({ default: m.IscDraftLoader })
  )
);
const IscEditBootstrap = lazy(() =>
  import("../../pages/indicator-specification-cards/creator/isc-route-loaders").then(
    (m) => ({ default: m.IscEditBootstrap })
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
const AdminOverview = lazy(() =>
  import("../../pages/admin/admin-overview.jsx")
);

// Routes that opt out of the standard "content sheet" (Container + padded Paper
// card) and render full-bleed instead — for editor/workspace pages where the
// card-in-card framing is undesirable (e.g. the ISC Creator workspace and the
// Basic Indicator wizard, whose own step panels already provide framing). Other
// authenticated routes are unaffected.
const FULL_BLEED_PATH_PREFIXES = [
  "/isc/creator",
  "/isc/new",
  "/isc/drafts",
  "/indicator/editor/basic",
];
// Full-bleed also for the edit bootstrap route /isc/:id/edit.
const isFullBleedPath = (pathname) =>
  FULL_BLEED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
  /^\/isc\/[^/]+\/edit\/?$/.test(pathname);

// The authenticated content region. Renders the matched route via <Outlet/>,
// wrapped in the content sheet by default, or full-bleed for editor routes.
// Lives inside AppShell so switching between sheet and full-bleed routes never
// remounts the shell (top bar / sidebar / drawer state are preserved).
const AuthenticatedContent = () => {
  const { pathname } = useLocation();
  const fullBleed = isFullBleedPath(pathname);

  return (
    <Container maxWidth="xl" sx={{ minHeight: "89vh" }}>
      {fullBleed ? (
        <Outlet />
      ) : (
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
      )}
    </Container>
  );
};

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
                  <NavigationGuardProvider>
                    <AppShell>
                      <AuthenticatedContent />
                      <Stack gap={2} sx={{ pt: 4 }}>
                        <Divider />
                        <Footer />
                      </Stack>
                    </AppShell>
                  </NavigationGuardProvider>
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
                  {/* Lifecycle entry points (static segments rank above :id) */}
                  <Route
                    path="new"
                    element={
                      <PrivateRoute
                        component={<IscNewRoute />}
                        allowedRoles={[
                          RoleTypes.user,
                          RoleTypes.userWithoutLRS,
                        ]}
                      />
                    }
                  />
                  <Route
                    path="drafts/:draftId"
                    element={
                      <PrivateRoute
                        component={<IscDraftLoader />}
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
                  <Route
                    path=":id/edit"
                    element={
                      <PrivateRoute
                        component={<IscEditBootstrap />}
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
                  path="/admin"
                  element={
                    <PrivateRoute
                      component={<AdminOverview />}
                      allowedRoles={[RoleTypes.admin]}
                    />
                  }
                />
                {/* Legacy admin paths are consolidated under /admin. These
                    redirects keep old links/bookmarks working; the JAR-
                    management pages return, restyled, under /admin/* in later
                    PRs. /admin enforces the admin role via PrivateRoute, so a
                    non-admin following these is bounced on to /login. */}
                <Route
                  path="/manage-analytics"
                  element={<Navigate to="/admin" replace />}
                />
                <Route
                  path="/manage-visualization"
                  element={<Navigate to="/admin" replace />}
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
