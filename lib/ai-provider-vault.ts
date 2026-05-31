import crypto from "node:crypto";

export type AiProviderName = "openai" | "gemini";

export type AiProviderSecretRecord = {
  apiKey: string;
  maskedKey: string;
  createdAt: string;
  updatedAt: string;
};

export type AiProviderBundle = {
  version: 1;
  activeProvider: AiProviderName | null;
  providers: Partial<Record<AiProviderName, AiProviderSecretRecord>>;
};

const VAULT_ALGORITHM = "aes-256-gcm";
const VAULT_SALT = "careeros-ai-provider-v1";

function getVaultSecret(secretOverride?: string) {
  const secret = secretOverride ?? process.env.AI_KEY_ENCRYPTION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!secret) {
    throw new Error("AI provider encryption secret is missing.");
  }

  return secret;
}

function deriveVaultKey(secret: string) {
  return crypto.scryptSync(secret, VAULT_SALT, 32);
}

export function normalizeAiProviderName(provider: string): AiProviderName {
  const normalized = provider.trim().toLowerCase();
  if (normalized !== "openai" && normalized !== "gemini") {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  return normalized;
}

export function maskApiKey(provider: AiProviderName, apiKey: string) {
  const normalizedKey = apiKey.trim();
  if (!normalizedKey.length) {
    return provider === "gemini" ? "AIza****" : "sk-****";
  }

  const suffix = normalizedKey.length <= 4 ? normalizedKey : normalizedKey.slice(-4);

  if (provider === "openai") {
    return `sk-****${suffix}`;
  }

  return `AIza****${suffix}`;
}

export function createEmptyAiProviderBundle(): AiProviderBundle {
  return {
    version: 1,
    activeProvider: null,
    providers: {}
  };
}

export function upsertProviderIntoBundle(bundle: AiProviderBundle, provider: AiProviderName, apiKey: string, timestamp = new Date().toISOString()): AiProviderBundle {
  const normalizedApiKey = apiKey.trim();
  if (!normalizedApiKey.length) {
    throw new Error("API key is required.");
  }

  const nextBundle: AiProviderBundle = {
    version: 1,
    activeProvider: bundle.activeProvider,
    providers: { ...bundle.providers }
  };

  const existing = nextBundle.providers[provider];
  nextBundle.providers[provider] = {
    apiKey: normalizedApiKey,
    maskedKey: maskApiKey(provider, normalizedApiKey),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };

  if (!nextBundle.activeProvider || provider === "openai") {
    nextBundle.activeProvider = provider;
  } else if (nextBundle.activeProvider === provider) {
    nextBundle.activeProvider = provider;
  }

  if (nextBundle.providers.openai && nextBundle.providers.gemini) {
    nextBundle.activeProvider = "openai";
  }

  return nextBundle;
}

export function resolvePreferredProvider(bundle: AiProviderBundle): AiProviderName | null {
  if (bundle.providers.openai?.apiKey) {
    return "openai";
  }

  if (bundle.providers.gemini?.apiKey) {
    return "gemini";
  }

  return bundle.activeProvider ?? null;
}

export function encryptAiProviderBundle(bundle: AiProviderBundle, secretOverride?: string) {
  const secret = getVaultSecret(secretOverride);
  const key = deriveVaultKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(VAULT_ALGORITHM, key, iv);
  const payload = JSON.stringify(bundle);
  const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return ["v1", iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptAiProviderBundle(encryptedBundle: string, secretOverride?: string): AiProviderBundle {
  const secret = getVaultSecret(secretOverride);
  const [version, ivValue, authTagValue, ciphertextValue] = encryptedBundle.split(":");

  if (version !== "v1" || !ivValue || !authTagValue || !ciphertextValue) {
    throw new Error("Unsupported AI provider bundle format.");
  }

  const key = deriveVaultKey(secret);
  const decipher = crypto.createDecipheriv(VAULT_ALGORITHM, key, Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(authTagValue, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64")),
    decipher.final()
  ]).toString("utf8");
  const parsed = JSON.parse(plaintext) as AiProviderBundle;

  return {
    version: 1,
    activeProvider: parsed.activeProvider ?? null,
    providers: parsed.providers ?? {}
  };
}

export function getProviderCredentials(bundle: AiProviderBundle, provider: AiProviderName) {
  const record = bundle.providers[provider];
  return record?.apiKey ?? null;
}
