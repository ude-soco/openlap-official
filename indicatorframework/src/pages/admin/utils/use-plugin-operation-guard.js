import { useEffect } from "react";
import { useSnackbar } from "notistack";
import { useNavigationGuard } from "../../../setup/routes-manager/navigation-guard-context.js";

export const usePluginOperationGuard = (busy) => {
  const { enqueueSnackbar } = useSnackbar();
  const guard = useNavigationGuard();
  const register = guard?.registerGuard;
  const unregister = guard?.unregisterGuard;
  useEffect(() => {
    if (!busy) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    const prevent = () => { enqueueSnackbar("Wait for this plugin operation to finish before leaving.", { variant: "info" }); return true; };
    window.addEventListener("beforeunload", warn); register?.(prevent);
    return () => { window.removeEventListener("beforeunload", warn); unregister?.(prevent); };
  }, [busy, enqueueSnackbar, register, unregister]);
};
