import { createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";

// Context + hooks for the centralized internal-navigation guard (Phase 3
// follow-up). The provider lives in navigation-guard.jsx; this module holds the
// context and the consumer hooks so the provider file only exports a component
// (keeps fast-refresh happy).
//
// A guard is `(targetPath) => boolean`: return `true` to INTERCEPT navigation
// (the caller remembers the target and acts later); falsy to allow it.
export const NavigationGuardContext = createContext(null);

// Full guard API (register/unregister/guardedNavigate). null if no provider.
export const useNavigationGuard = () => useContext(NavigationGuardContext);

// Navigation helper for links/menus. Falls back to plain navigate when used
// outside the provider (e.g. public pages), so it's always safe to call.
export const useGuardedNavigate = () => {
  const ctx = useContext(NavigationGuardContext);
  const navigate = useNavigate();
  return ctx ? ctx.guardedNavigate : navigate;
};
