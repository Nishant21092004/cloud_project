/** Typed API client — every call carries the session cookie; errors arrive as ApiError. */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

interface Options {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? "GET",
      credentials: "include",
      headers: {
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Cannot reach the BloomNest server — is it running?");
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    throw new ApiError(res.status, err?.code ?? "UNKNOWN", err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return data as T;
}

/** Idempotency key generator for checkout (regenerated per checkout attempt session). */
export function newIdempotencyKey(): string {
  return `ck_${crypto.randomUUID()}`;
}

/** Uploads go as raw bytes — the server sniffs magic bytes, not headers. */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const res = await fetch("/api/admin/uploads", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  const data = (await res.json()) as { url?: string; error?: { message: string } };
  if (!res.ok || !data.url) throw new ApiError(res.status, "UPLOAD_FAILED", data.error?.message ?? "Upload failed");
  return { url: data.url };
}
