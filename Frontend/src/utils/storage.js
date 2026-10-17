// Thin wrappers so a blocked/full localStorage never crashes the app.
const TOKEN_KEY = "sevasetu.token";
const USER_KEY = "sevasetu.user";

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
function safeRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const tokenStorage = {
  get: () => safeGet(TOKEN_KEY),
  set: (token) => safeSet(TOKEN_KEY, token),
  clear: () => safeRemove(TOKEN_KEY),
};

export const userStorage = {
  get: () => {
    const raw = safeGet(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  set: (user) => safeSet(USER_KEY, JSON.stringify(user)),
  clear: () => safeRemove(USER_KEY),
};
