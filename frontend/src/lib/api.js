import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const formatTL = (n) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n || 0);

export const sizeLabel = (s) => {
  if (!s) return "";
  if (s === "tall") return "Tall";
  if (s === "grande") return "Grande";
  if (s === "venti") return "Venti";
  if (s === "standart") return "Standart";
  return s;
};

export const categoryLabel = (c) => ({ hot: "Sıcak İçecekler", cold: "Soğuk İçecekler", other: "Diğer Ürünler" }[c] || c);
