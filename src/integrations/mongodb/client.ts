"use client";

type ApiResponse<T = any> = {
  data?: T;
  error?: { message: string };
  count?: number;
};

async function request<T = any>(args: { url: string; method?: string; body?: unknown; headers?: Record<string, string> }): Promise<ApiResponse<T>> {
  const { url, method = "GET", body, headers = {} } = args;

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const result = await res.json();
  if (!res.ok) {
    return { error: { message: result.error || "Request failed" } };
  }
  return { data: result.data as T, count: result.count };
}

function buildQuery(params: Record<string, any>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => qs.append(key, String(v)));
      } else {
        qs.set(key, String(value));
      }
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

class SelectBuilder {
  constructor(private table: string, private fields: string = "*", private state: Record<string, any> = {}) {}

  select(fields = "*") {
    return new SelectBuilder(this.table, fields, this.state);
  }

  eq(field: string, value: any) {
    this.state[field] = value;
    return this;
  }

  in(field: string, values: any[]) {
    this.state[field] = values.join(",");
    return this;
  }

  gte(field: string, value: any) {
    this.state[`${field}.gte`] = value;
    return this;
  }

  lte(field: string, value: any) {
    this.state[`${field}.lte`] = value;
    return this;
  }

  or(orValue: string) {
    this.state.or = orValue;
    return this;
  }

  not(field: string, op: string, value: any) {
    this.state[`${field}.${op}`] = value;
    return this;
  }

  neq(field: string, value: any) {
    this.state[`${field}.neq`] = value;
    return this;
  }

  single() {
    this.state.single = "true";
    return this;
  }

  maybeSingle() {
    this.state.maybeSingle = "true";
    return this;
  }

  limit(count: number) {
    this.state.limit = String(count);
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this.state.order = `${opts?.ascending ? "" : "-"}${field}`;
    return this;
  }

  async then(resolve: (value: ApiResponse<any>) => void, reject: (reason?: any) => void) {
    try {
      const params: Record<string, any> = { model: this.table, ...this.state };
      const result = await request<any>({ url: `/api/db${buildQuery(params)}` });
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }
}

class InsertBuilder {
  constructor(private table: string, private data: any, private state: Record<string, any> = {}) {}

  select(fields = "*") {
    return new InsertBuilder(this.table, this.data, { ...this.state, _select: true, _fields: fields });
  }

  single() {
    return new InsertBuilder(this.table, this.data, { ...this.state, _single: true });
  }

  async then(resolve: (value: ApiResponse<any>) => void, reject: (reason?: any) => void) {
    try {
      const body = { model: this.table, data: this.data };
      const result = await request<any>({ url: "/api/db", method: "POST", body });
      if (result.data) {
        resolve({ data: result.data });
      } else {
        resolve(result);
      }
    } catch (err) {
      reject(err);
    }
  }
}

class UpdateBuilder {
  constructor(private table: string, private data: Record<string, any>, private state: Record<string, any> = {}) {}

  select(fields = "*") {
    return new UpdateBuilder(this.table, this.data, { ...this.state, _select: true, _fields: fields });
  }

  eq(field: string, value: any) {
    this.state[field] = value;
    return this;
  }

  in(field: string, values: any[]) {
    this.state[field] = values.join(",");
    return this;
  }

  neq(field: string, value: any) {
    this.state[`${field}.neq`] = value;
    return this;
  }

  async then(resolve: (value: ApiResponse<any>) => void, reject: (reason?: any) => void) {
    try {
      const body = { model: this.table, data: this.data, filter: this.state };
      const result = await request<any>({ url: `/api/db`, method: "PATCH", body });
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }
}

class DeleteBuilder {
  constructor(private table: string, private state: Record<string, any> = {}) {}

  eq(field: string, value: any) {
    this.state[field] = value;
    return this;
  }

  async then(resolve: (value: ApiResponse<any>) => void, reject: (reason?: any) => void) {
    try {
      const body = { model: this.table, filter: this.state };
      const result = await request<any>({ url: `/api/db`, method: "DELETE", body });
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }
}

class FromBuilder {
  constructor(private table: string) {}

  select(fields = "*", _options?: Record<string, any>) {
    return new SelectBuilder(this.table, fields);
  }

  insert(data: any[] | any) {
    const payload = Array.isArray(data) ? data[0] : data;
    return new InsertBuilder(this.table, payload);
  }

  update(data: any) {
    return new UpdateBuilder(this.table, data);
  }

  upsert(data: any[] | any, options?: { onConflict?: string }) {
    const payload = Array.isArray(data) ? data[0] : data;
    return request({ url: "/api/db", method: "POST", body: { model: this.table, data: payload, upsert: true, onConflict: options?.onConflict } });
  }

  delete() {
    return new DeleteBuilder(this.table);
  }
}

const from = (table: string) => new FromBuilder(table);

const rpc = async (name: string, args?: any) => {
  return request({ url: `/api/rpc/${name}`, method: "POST", body: args || {} });
};

const channel = (_name: string) => {
  const builder = {
    on: (_event: string, _opts: any, _callback?: any) => builder,
    subscribe: () => ({ unsubscribe: () => {} }),
  };
  return builder;
};

const removeChannel = (_ch: any) => {};

const auth = {
  signUp: async (opts: { email: string; password: string; options?: any }) => {
    const res = await request<{ user: any; session: any }>({ url: "/api/auth", method: "POST", body: { action: "signup", ...opts } });
    if (res.error) return { error: { message: (res.error as any)?.message || "Error" } };
    return { data: { user: res.data?.user, session: { access_token: "", user: res.data?.user } } };
  },
  signInWithPassword: async (opts: { email: string; password: string }) => {
    const res = await request<{ user: any; session: any }>({ url: "/api/auth", method: "POST", body: { action: "signin", ...opts } });
    if (res.error) return { error: { message: (res.error as any)?.message || "Error" } };
    return { data: { user: res.data?.user, session: { access_token: "", user: res.data?.user } } };
  },
  getSession: async () => {
    const res = await request<any>({ url: "/api/auth?action=session" });
    if (res.error) return { data: { session: null } };
    return { data: { session: res.data?.session || null } };
  },
  getUser: async () => {
    const res = await request<any>({ url: "/api/auth?action=user" });
    if (res.error) return { data: { user: null } };
    return { data: { user: res.data?.user || null } };
  },
  onAuthStateChange: (_callback: (_event: string, session: any) => void) => {
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  },
  signOut: async () => {
    localStorage.removeItem("access_token");
    return { data: {} };
  },
};

export const supabase = {
  from,
  rpc,
  channel,
  removeChannel,
  auth,
};
