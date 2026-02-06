const API_BASE = "http://localhost:3001";

let authToken = null;

// Debug state (last request/response)
let lastDebug = null;
const listeners = new Set();

export function setToken(token) {
  authToken = token;
}

export function clearToken() {
  authToken = null;
}

export function getToken() {
  return authToken;
}

export function subscribeDebug(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emitDebug(d) {
  lastDebug = d;
  for (const fn of listeners) fn(lastDebug);
}

export function getLastDebug() {
  return lastDebug;
}

async function request(method, path, body) {
  const url = `${API_BASE}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const startedAt = Date.now();

  let resp;
  let respText = "";
  try {
    resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    respText = await resp.text();
  } catch (e) {
    emitDebug({
      startedAt,
      ms: Date.now() - startedAt,
      method,
      url,
      requestBody: body ?? null,
      status: null,
      responseBody: String(e)
    });
    throw e;
  }

  let data = null;
  try {
    data = respText ? JSON.parse(respText) : null;
  } catch {
    data = respText;
  }

  emitDebug({
    startedAt,
    ms: Date.now() - startedAt,
    method,
    url,
    requestBody: body ?? null,
    status: resp.status,
    responseBody: data
  });

  if (resp.status === 401) {
    const err = new Error("Unauthorized");
    err.status = 401;
    err.data = data;
    throw err;
  }

  if (!resp.ok) {
    const err = new Error(data?.message || `Request failed (${resp.status})`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  login: (username, password) => request("POST", "/auth/login", { username, password }),
  getJobs: (search) => request("GET", `/jobs?search=${encodeURIComponent(search || "")}`),
  getMilestones: (jobId) => request("GET", `/jobs/${encodeURIComponent(jobId)}/milestones`),
  updateMilestone: (id, patch) => request("PUT", `/milestones/${id}`, patch)
};
