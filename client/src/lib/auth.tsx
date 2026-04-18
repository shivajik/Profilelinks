import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "./queryClient";
import type { User } from "@shared/schema";
import { useLocation } from "wouter";

type AuthUser = Omit<User, "password">;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_ME_QUERY_KEY = ["/api/auth/me"] as const;

// Routes that are purely public and never need auth/me
const PUBLIC_ONLY_PREFIXES = ["/terms", "/privacy", "/docs", "/about", "/contact", "/support", "/gdpr", "/refund-policy", "/restaurant"];

function isPublicOnlyRoute(path: string): boolean {
  if (PUBLIC_ONLY_PREFIXES.some((p) => path.startsWith(p))) return true;
  // Public profile routes: /{username} or /{company}/{username} or /{username}/menu
  // But NOT /auth, /dashboard, /onboarding, /pricing, /affiliate, /invite, /change-password
  const knownAppRoutes = [
    "/",
    "/auth",
    "/dashboard",
    "/onboarding",
    "/pricing",
    "/affiliate",
    "/invite",
    "/change-password",
    "/ltd-register",
    "/ltd-purchase",
    "/admin",
  ];
  if (knownAppRoutes.some((r) => path === r || (r !== "/" && path.startsWith(r)))) return false;
  // If none of the known app routes match, it's a public profile
  if (/^\/[a-zA-Z0-9_-]+/.test(path)) return true;
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const skipAuth = useMemo(() => isPublicOnlyRoute(location), [location]);

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !skipAuth,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      const nextUser = (await res.json()) as AuthUser;
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, nextUser);
      return nextUser;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ username, email, password }: { username: string; email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", { username, email, password });
      const nextUser = (await res.json()) as AuthUser;
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, nextUser);
      return nextUser;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null);
      queryClient.clear();
      queryClient.removeQueries();
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (username: string, email: string, password: string) => {
    await registerMutation.mutateAsync({ username, email, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading: skipAuth ? false : isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
