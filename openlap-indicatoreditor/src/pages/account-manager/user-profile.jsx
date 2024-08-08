import React, {useContext, useEffect, useState} from "react";
import {AuthContext} from "../../setup/auth-context-manager/auth-context-manager.jsx";
import {fetchUserData} from "./user-api";

const UserProfile = () => {
  const {logout, api} = useContext(AuthContext);

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await fetchUserData(api);
        setData(userData);
      } catch (error) {
        console.error("Failed to load user data", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [api]);

  return (
    <>
      {loading ? (
        <p>Loading...</p>
      ) : data ? (
        <div>
          <h1>Welcome {data.name}</h1>
          <p>Email: {data.email}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <p>No data found</p>
      )}
    </>
  );
};

export default UserProfile;
