import "server-only";

/**
 * How each service actually authenticates, and how to prove a credential works.
 *
 * The old integrations page had one "Connect" button for all 78 services and
 * connected to none of them. Services differ fundamentally:
 *
 *   token    — the provider issues a personal token you paste. Works
 *              immediately, no app registration. GitHub, Slack, Notion…
 *   webhook  — you paste a URL that accepts posts. Slack incoming webhooks.
 *   oauth    — needs a client id and secret registered with the provider,
 *              which only the account owner can create. Gmail, Drive, Figma…
 *
 * Only the first two can be made to work from inside this app. The third is
 * marked honestly rather than given a button that pretends.
 */

export type AuthKind = "token" | "webhook" | "oauth";

export interface Provider {
  kind: AuthKind;
  /** What to ask for, in the user's words. */
  label: string;
  /** Where the user gets it. */
  help: string;
  docs?: string;
  /** Proves the credential works and names the account it belongs to. */
  verify?: (secret: string) => Promise<{ ok: boolean; account?: string; error?: string }>;
}

const json = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

export const PROVIDERS: Record<string, Provider> = {
  github: {
    kind: "token",
    label: "Personal access token",
    help: "GitHub → Settings → Developer settings → Personal access tokens. Give it repo scope.",
    docs: "https://github.com/settings/tokens",
    async verify(secret) {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "trove",
        },
      });
      if (!res.ok) {
        return {
          ok: false,
          error:
            res.status === 401
              ? "GitHub rejected that token."
              : `GitHub returned ${res.status}.`,
        };
      }
      const me = await json(res);
      return { ok: true, account: me?.login ? `@${me.login}` : "connected" };
    },
  },

  slack: {
    kind: "webhook",
    label: "Incoming webhook URL",
    help: "Slack → your app → Incoming Webhooks → Add New Webhook to Workspace.",
    docs: "https://api.slack.com/messaging/webhooks",
    async verify(secret) {
      if (!/^https:\/\/hooks\.slack\.com\//.test(secret)) {
        return { ok: false, error: "That does not look like a Slack webhook URL." };
      }
      // Slack answers invalid_payload for a well-formed URL with a bad body,
      // which proves the endpoint exists without posting a message to anyone.
      const res = await fetch(secret, { method: "POST", body: "" });
      const body = await res.text().catch(() => "");
      if (res.status === 404 || /no_service|no_team/i.test(body)) {
        return { ok: false, error: "Slack does not recognise that webhook." };
      }
      return { ok: true, account: "workspace webhook" };
    },
  },

  notion: {
    kind: "token",
    label: "Internal integration secret",
    help: "Notion → Settings → Connections → Develop or manage integrations → New integration.",
    docs: "https://www.notion.so/my-integrations",
    async verify(secret) {
      const res = await fetch("https://api.notion.com/v1/users/me", {
        headers: {
          Authorization: `Bearer ${secret}`,
          "Notion-Version": "2022-06-28",
        },
      });
      if (!res.ok) return { ok: false, error: `Notion returned ${res.status}.` };
      const me = await json(res);
      return { ok: true, account: me?.bot?.workspace_name ?? me?.name ?? "connected" };
    },
  },

  linear: {
    kind: "token",
    label: "API key",
    help: "Linear → Settings → API → Personal API keys.",
    docs: "https://linear.app/settings/api",
    async verify(secret) {
      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: { Authorization: secret, "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ viewer { name email } }" }),
      });
      const data = await json(res);
      if (!res.ok || data?.errors) {
        return { ok: false, error: "Linear rejected that key." };
      }
      return { ok: true, account: data?.data?.viewer?.name ?? "connected" };
    },
  },

  resend: {
    kind: "token",
    label: "API key",
    help: "Resend → API Keys → Create API Key. This is how Trove sends real email.",
    docs: "https://resend.com/api-keys",
    async verify(secret) {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (res.status === 401) return { ok: false, error: "Resend rejected that key." };
      if (!res.ok) return { ok: false, error: `Resend returned ${res.status}.` };
      return { ok: true, account: "connected" };
    },
  },

  vercel: {
    kind: "token",
    label: "Access token",
    help: "Vercel → Account Settings → Tokens.",
    docs: "https://vercel.com/account/tokens",
    async verify(secret) {
      const res = await fetch("https://api.vercel.com/v2/user", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!res.ok) return { ok: false, error: `Vercel returned ${res.status}.` };
      const me = await json(res);
      return { ok: true, account: me?.user?.username ?? "connected" };
    },
  },

  airtable: {
    kind: "token",
    label: "Personal access token",
    help: "Airtable → Developer hub → Personal access tokens.",
    docs: "https://airtable.com/create/tokens",
    async verify(secret) {
      const res = await fetch("https://api.airtable.com/v0/meta/whoami", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!res.ok) return { ok: false, error: `Airtable returned ${res.status}.` };
      return { ok: true, account: "connected" };
    },
  },

  telegram: {
    kind: "token",
    label: "Bot token",
    help: "Message @BotFather on Telegram and create a bot.",
    docs: "https://core.telegram.org/bots#botfather",
    async verify(secret) {
      const res = await fetch(`https://api.telegram.org/bot${secret}/getMe`);
      const data = await json(res);
      if (!data?.ok) return { ok: false, error: "Telegram rejected that bot token." };
      return { ok: true, account: `@${data.result?.username ?? "bot"}` };
    },
  },
};

/** Everything else needs an OAuth app the account owner must register. */
export function providerFor(serviceId: string): Provider {
  return (
    PROVIDERS[serviceId] ?? {
      kind: "oauth",
      label: "OAuth",
      help: "This service needs an OAuth app registered with the provider, using credentials only its account owner can create.",
    }
  );
}

export const CONNECTABLE = Object.keys(PROVIDERS);
