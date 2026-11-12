import { useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { NavigationGuardContext } from "./navigation-guard-context.js";

// Centralized internal-navigation guard provider (Phase 3 follow-up).
//
// The app uses <BrowserRouter> (not a data router), so React Router's useBlocker
// is unavailable. Instead, navigation surfaces (sidebar, top bar, etc.) call
// `guardedNavigate`, and a feature (e.g. the ISC creator editing a draft) can
// register a guard that intercepts a pending navigation to show a confirmation.
// Context + consumer hooks live in navigation-guard-context.js.
export const NavigationGuardProvider = ({ children }) => {
  const navigate = useNavigate();
  const guardRef = useRef(null); // single active guard fn (or null)

  const registerGuard = useCallback((fn) => {
    guardRef.current = fn;
  }, []);

  const unregisterGuard = useCallback((fn) => {
    if (guardRef.current === fn) guardRef.current = null;
  }, []);

  // Navigate unless an active guard intercepts. Returns true if it navigated.
  const guardedNavigate = useCallback(
    (to, options) => {
      const guard = guardRef.current;
      if (guard && guard(to) === true) return false; // intercepted
      navigate(to, options);
      return true;
    },
    [navigate]
  );

  return (
    <NavigationGuardContext.Provider
      value={{ registerGuard, unregisterGuard, guardedNavigate }}
    >
      {children}
    </NavigationGuardContext.Provider>
  );
};

NavigationGuardProvider.propTypes = { children: PropTypes.node };
