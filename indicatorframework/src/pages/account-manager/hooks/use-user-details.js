import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { requestUserDetails } from "../utils/account-manager-api";

const EMPTY_USER = {
  name: "",
  email: "",
  lrsProviderList: [],
  lrsConsumerList: [],
};

/**
 * Loads the current user's details on mount and exposes a `reload` to refetch
 * (e.g. after a profile update). Behaviour is otherwise unchanged: fetch,
 * log on failure, expose `loading`/`error`. The API call itself is unchanged.
 *
 * @returns {{ loading: boolean, error: boolean, user: object, reload: () => Promise<void> }}
 */
export const useUserDetails = () => {
  const { api } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [user, setUser] = useState(EMPTY_USER);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await requestUserDetails(api);
      setUser((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.error("Failed to load user data", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, error, user, reload };
};

export default useUserDetails;
