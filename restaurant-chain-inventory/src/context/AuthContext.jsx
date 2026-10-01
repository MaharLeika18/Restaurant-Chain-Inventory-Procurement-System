import * as React from 'react';
import { api, setToken, getStoredToken } from '../api/client';

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  // 'loading' = still checking a stored token; only then do we know whether to bounce to /login
  const [status, setStatus] = React.useState('loading');

  React.useEffect(() => {
    if (!getStoredToken()) {
      setStatus('signed-out');
      return;
    }
    api
      .me()
      .then((me) => {
        setUser(me);
        setStatus('signed-in');
      })
      .catch(() => {
        // Stored token is expired/invalid - clear it rather than get stuck.
        setToken(null);
        setStatus('signed-out');
      });
  }, []);

  const login = React.useCallback(async (username, password) => {
    const { access_token } = await api.login(username, password);
    setToken(access_token);
    const me = await api.me();
    setUser(me);
    setStatus('signed-in');
    return me;
  }, []);

  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus('signed-out');
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
