import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { requestUserDetails } from "../utils/account-manager-api";

const EMPTY_USER = {
  name: "",
  email: "",
  lrsProviderList: [],
  lrsConsumerList: [],
};

/**
 * Loads the current user's details once on mount.
 *
 * Extracted from the duplicated `loadUserData` logic that lived in Home and
 * UserProfile. Behaviour is intentionally identical: fetch on mount, log on
 * failure, expose a `loading` flag. The API call itself is unchanged.
 *
 * @returns {{ loading: boolean, error: boolean, user: object }}
 */
export const useUserDetails = () => {
  const { api } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [user, setUser] = useState(EMPTY_USER);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await requestUserDetails(api);
        if (active) setUser((prev) => ({ ...prev, ...data }));
      } catch (err) {
        console.error("Failed to load user data", err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [api]);

  return { loading, error, user };
};

export default useUserDetails;
