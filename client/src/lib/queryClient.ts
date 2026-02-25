import { QueryClient, QueryFunction } from "@tanstack/react-query";

function extractApiErrorMessage(rawText: string, fallbackMessage: string) {
  const cleanedRaw = rawText.replace(/^\d{3}\s*:\s*/, "").trim();

  try {
    const parsed = JSON.parse(cleanedRaw);

    if (typeof parsed === "string" && parsed.trim()) {
      return parsed.trim();
    }

    if (parsed && typeof parsed === "object") {
      if (typeof (parsed as { message?: unknown }).message === "string") {
        return ((parsed as { message: string }).message || "").trim() || fallbackMessage;
      }
      if (typeof (parsed as { error?: unknown }).error === "string") {
        return ((parsed as { error: string }).error || "").trim() || fallbackMessage;
      }
    }
  } catch {
    // Not JSON; fall through to cleaned raw text.
  }

  return cleanedRaw || fallbackMessage;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || "";
    throw new Error(extractApiErrorMessage(text, res.statusText || "Request failed"));
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
