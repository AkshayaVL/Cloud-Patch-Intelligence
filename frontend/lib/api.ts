import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auto-attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("cpi_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth
export const authAPI = {
  register: (email: string, password: string) =>
    api.post("/auth/register", { email, password }),
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
};

// Scan
export const scanAPI = {
  run: (data: object) => api.post("/scan/run", data),
  history: () => api.get("/scan/history"),
};

// Results
export const resultsAPI = {
  getByScan: (scanId: string) => api.get(`/results/${scanId}`),
  getAll: () => api.get("/results/"),
};

// PRs
export const prsAPI = {
  getAll: () => api.get("/prs/"),
};

// Score
export const scoreAPI = {
  getLatest: () => api.get("/score/latest"),
  getHistory: () => api.get("/score/history"),
};