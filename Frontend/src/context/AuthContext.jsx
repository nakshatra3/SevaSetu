import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as authApi from "@/api/authApi";
import { setUnauthorizedHandler } from "@/api/httpClient";
import { tokenStorage, userStorage } from "@/utils/storage";
import { getTokenExpiry } from "@/utils/jwt";

export const AuthContext = createContext(null);

// Restore a saved session, dropping it if the token already expired.
function readSession() {
  const token = tokenStorage.get();
  const user = userStorage.get();
  if (!token || !user) return { token: null, user: null };
  const expiry = getTokenExpiry(token);
  if (expiry && expiry <= Date.now()) {
    tokenStorage.clear();
    userStorage.clear();
    return { token: null, user: null };
  }
  return { token, user };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [sessionExpired, setSessionExpired] = useState(false);
  const timer = useRef(null);

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    userStorage.clear();
    setSession({ token: null, user: null });
  }, []);

  const logout = useCallback(() => {
    setSessionExpired(false);
    clearSession();
  }, [clearSession]);

  const expire = useCallback(() => {
    setSessionExpired(true);
    clearSession();
  }, [clearSession]);

  // Any 401 from the API logs the user out.
  useEffect(() => {
    setUnauthorizedHandler(expire);
    return () => setUnauthorizedHandler(null);
  }, [expire]);

  // Log out automatically when the JWT expires (backend default: 30 min).
  useEffect(() => {
    clearTimeout(timer.current);
    if (!session.token) return undefined;
    const expiry = getTokenExpiry(session.token);
    if (!expiry) return undefined;
    const delay = Math.min(Math.max(expiry - Date.now(), 0), 2 ** 31 - 1);
    timer.current = setTimeout(expire, delay);
    return () => clearTimeout(timer.current);
  }, [session.token, expire]);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    tokenStorage.set(data.access_token);
    userStorage.set(data.user);
    setSession({ token: data.access_token, user: data.user });
    setSessionExpired(false);
    return data.user;
  }, []);

  // The backend returns only the new user (no token), so the user logs in next.
  const register = useCallback((payload) => authApi.register(payload), []);

  const updateUser = useCallback((patch) => {
    setSession((prev) => {
      if (!prev.user) return prev;
      const user = { ...prev.user, ...patch };
      userStorage.set(user);
      return { ...prev, user };
    });
  }, []);

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      isAuthenticated: Boolean(session.token && session.user),
      sessionExpired,
      login,
      register,
      logout,
      updateUser,
    }),
    [session, sessionExpired, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
