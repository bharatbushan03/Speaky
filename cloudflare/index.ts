import { DurableObject } from "cloudflare:workers";

const PORT = 8000;
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

interface Env {
  API_CONTAINER: DurableObjectNamespace<ApiContainer>;
  ENVIRONMENT: string;
  DEBUG: string;
  LOG_LEVEL: string;
  AI_PROVIDER: string;
  AI_REQUEST_TIMEOUT_SECONDS: string;
  STT_PROVIDER: string;
  TTS_PROVIDER: string;
  OPENAI_MODEL: string;
  MAX_REQUEST_BODY_BYTES: string;
  RATE_LIMIT_REQUESTS: string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ALLOWED_ORIGINS: string;
  SUPABASE_KEY?: string;
  DATABASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_TTS_MODEL?: string;
  OPENAI_TTS_VOICE?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  AZURE_OPENAI_API_KEY?: string;
  AZURE_OPENAI_DEPLOYMENT?: string;
}

function assertReady(env: Env): void {
  const missing = ["SECRET_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "ALLOWED_ORIGINS"].filter(
    (key) => !env[key as keyof Env]
  );
  if (missing.length) throw new Error(`Set Worker secrets: ${missing.join(", ")}`);
  if (env.SECRET_KEY === "change-this-in-production" || env.SECRET_KEY.length < 32) {
    throw new Error("SECRET_KEY must be a random value of at least 32 characters");
  }
  const origins = env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (env.ENVIRONMENT === "production" && origins.some((origin) => !origin.startsWith("https://"))) {
    throw new Error("ALLOWED_ORIGINS must be comma-separated https origins");
  }
}

function containerEnv(env: Env): Record<string, string> {
  const values: Record<string, string | undefined> = {
    ENVIRONMENT: env.ENVIRONMENT,
    DEBUG: env.DEBUG,
    LOG_LEVEL: env.LOG_LEVEL,
    AI_PROVIDER: env.AI_PROVIDER,
    AI_REQUEST_TIMEOUT_SECONDS: env.AI_REQUEST_TIMEOUT_SECONDS,
    STT_PROVIDER: env.STT_PROVIDER,
    TTS_PROVIDER: env.TTS_PROVIDER,
    OPENAI_MODEL: env.OPENAI_MODEL,
    MAX_REQUEST_BODY_BYTES: env.MAX_REQUEST_BODY_BYTES,
    RATE_LIMIT_REQUESTS: env.RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_SECONDS: env.RATE_LIMIT_WINDOW_SECONDS,
    SECRET_KEY: env.SECRET_KEY,
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
    SUPABASE_KEY: env.SUPABASE_KEY,
    DATABASE_URL: env.DATABASE_URL,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_TTS_MODEL: env.OPENAI_TTS_MODEL,
    OPENAI_TTS_VOICE: env.OPENAI_TTS_VOICE,
    AZURE_OPENAI_ENDPOINT: env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY: env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_DEPLOYMENT: env.AZURE_OPENAI_DEPLOYMENT,
  };
  return Object.fromEntries(Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1])));
}

export class ApiContainer extends DurableObject<Env> {
  private starting: Promise<void> | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const container = ctx.container;
    if (container?.running) {
      void ctx.blockConcurrencyWhile(() => container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS));
    }
  }

  async fetch(request: Request): Promise<Response> {
    this.starting ??= this.startAndWaitForPort().finally(() => {
      this.starting = undefined;
    });
    await this.starting;

    const url = new URL(request.url);
    url.protocol = "http:";
    url.host = "container";
    const forwarded = new Request(url, request);
    forwarded.headers.delete("host");
    return this.ctx.container!.getTcpPort(PORT).fetch(forwarded);
  }

  private async startAndWaitForPort(): Promise<void> {
    const container = this.ctx.container!;
    if (!container.running) {
      assertReady(this.env);
      container.start({
        image: container.images.api,
        instance: "basic",
        // ponytail: outbound network is required for Supabase and the AI provider.
        enableInternet: true,
        env: containerEnv(this.env),
      });
    }
    await container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS);

    const port = container.getTcpPort(PORT);
    let lastError: unknown;
    for (let attempt = 0; attempt < 150; attempt++) {
      try {
        const response = await port.fetch("http://container/health", { signal: AbortSignal.timeout(1000) });
        await response.body?.cancel();
        if (response.ok) return;
        lastError = new Error(`Health check returned ${response.status}`);
      } catch (error) {
        lastError = error;
      }
      await scheduler.wait(200);
    }
    throw new Error("API container did not become ready on port 8000", { cause: lastError });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await env.API_CONTAINER.getByName("api").fetch(request);
    } catch (error) {
      console.error("API container request failed", error);
      const message = error instanceof Error ? error.message : "";
      const safe = message.startsWith("Set Worker secrets:") || message.startsWith("SECRET_KEY") || message.startsWith("ALLOWED_ORIGINS");
      return new Response(safe ? message : "API container is not ready", { status: 503 });
    }
  },
} satisfies ExportedHandler<Env>;
