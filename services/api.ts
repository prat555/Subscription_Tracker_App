const BASE_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/api`;

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billing_cycle: string;
  next_billing_date: string;
  category: string;
  color: string;
  icon: string;
  reminder_enabled: boolean;
  created_at: string;
}

export interface Analytics {
  monthly_total: number;
  yearly_total: number;
  subscription_count: number;
  category_breakdown: Record<string, number>;
  upcoming_bills: (Subscription & { days_until: number })[];
}

export interface AIInsight {
  type: "warning" | "tip" | "saving" | "info";
  title: string;
  message: string;
  icon: string;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

const call = async (url: string, options?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new Error("Request timed out");
    throw e;
  }
};

// ─── Mock data (shown when backend is unavailable) ───────────────────────────

const today = new Date();
const addDays = (d: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().split("T")[0];
};

export const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "mock-1", name: "Netflix", amount: 649, billing_cycle: "monthly",
    next_billing_date: addDays(3), category: "Entertainment",
    color: "#D94B4B", icon: "film", reminder_enabled: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-2", name: "Spotify", amount: 119, billing_cycle: "monthly",
    next_billing_date: addDays(12), category: "Music",
    color: "#3E9C74", icon: "music", reminder_enabled: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-3", name: "Amazon Prime", amount: 1499, billing_cycle: "yearly",
    next_billing_date: addDays(45), category: "Shopping",
    color: "#4A9CD9", icon: "shopping-bag", reminder_enabled: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-4", name: "YouTube Premium", amount: 189, billing_cycle: "monthly",
    next_billing_date: addDays(5), category: "Entertainment",
    color: "#E87A60", icon: "play", reminder_enabled: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-5", name: "Notion", amount: 800, billing_cycle: "monthly",
    next_billing_date: addDays(18), category: "Productivity",
    color: "#9E9B95", icon: "file-text", reminder_enabled: true,
    created_at: new Date().toISOString(),
  },
];

const getMockAnalytics = (): Analytics => {
  const monthly_total =
    649 + 119 + 1499 / 12 + 189 + 800;
  return {
    monthly_total: Math.round(monthly_total),
    yearly_total: Math.round(monthly_total * 12),
    subscription_count: MOCK_SUBSCRIPTIONS.length,
    category_breakdown: {
      Entertainment: 649 + 189,
      Music: 119,
      Shopping: Math.round(1499 / 12),
      Productivity: 800,
    },
    upcoming_bills: MOCK_SUBSCRIPTIONS.filter((s) => {
      const days = Math.ceil(
        (new Date(s.next_billing_date).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return days >= 0 && days <= 7;
    }).map((s) => ({
      ...s,
      days_until: Math.ceil(
        (new Date(s.next_billing_date).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
    })),
  };
};

// ─── API ─────────────────────────────────────────────────────────────────────

export const subscriptionApi = {
  getAll: async (): Promise<Subscription[]> => {
    try {
      return await call(`${BASE_URL}/subscriptions`);
    } catch {
      return MOCK_SUBSCRIPTIONS;
    }
  },

  create: (data: Omit<Subscription, "id" | "created_at">): Promise<Subscription> =>
    call(`${BASE_URL}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getById: async (id: string): Promise<Subscription> => {
    try {
      return await call(`${BASE_URL}/subscriptions/${id}`);
    } catch {
      const mock = MOCK_SUBSCRIPTIONS.find((s) => s.id === id);
      if (mock) return mock;
      throw new Error("Subscription not found");
    }
  },

  update: (
    id: string,
    data: Partial<Omit<Subscription, "id" | "created_at">>
  ): Promise<Subscription> =>
    call(`${BASE_URL}/subscriptions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<void> =>
    call(`${BASE_URL}/subscriptions/${id}`, { method: "DELETE" }),

  getAnalytics: async (): Promise<Analytics> => {
    try {
      return await call(`${BASE_URL}/analytics`);
    } catch {
      return getMockAnalytics();
    }
  },

  getAiInsights: async (): Promise<{ insights: AIInsight[] }> => {
    try {
      return await call(`${BASE_URL}/insights/ai`, { method: "POST" });
    } catch {
      return {
        insights: [
          {
            type: "info",
            title: "Backend Offline",
            message: "Connect to your backend server to get personalised AI insights.",
            icon: "info",
          },
        ],
      };
    }
  },

  seed: (): Promise<{ seeded: boolean }> =>
    call(`${BASE_URL}/seed`, { method: "POST" }),

  checkHealth: async (): Promise<boolean> => {
    try {
      await call(`${BASE_URL}/health`);
      return true;
    } catch {
      return false;
    }
  },
};

// ─── Formatters ───────────────────────────────────────────────────────────────

export const formatCurrency = (amount: number, cycle?: string): string => {
  const num = amount.toLocaleString("en-IN");
  if (!cycle) return `₹${num}`;
  const label = cycle === "monthly" ? "mo" : cycle === "yearly" ? "yr" : "mo";
  return `₹${num}/${label}`;
};

export const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export const formatShortDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
};
