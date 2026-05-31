import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyAiProviderBundle,
  decryptAiProviderBundle,
  encryptAiProviderBundle,
  getProviderCredentials,
  maskApiKey,
  resolvePreferredProvider,
  upsertProviderIntoBundle
} from "../lib/ai-provider-vault";

test("AI provider vault encrypts and decrypts bundles", () => {
  const secret = "unit-test-secret";
  const bundle = upsertProviderIntoBundle(createEmptyAiProviderBundle(), "openai", "sk-test-12345678", "2026-05-31T00:00:00.000Z");
  const encrypted = encryptAiProviderBundle(bundle, secret);
  const decrypted = decryptAiProviderBundle(encrypted, secret);

  assert.equal(decrypted.providers.openai?.apiKey, "sk-test-12345678");
  assert.equal(resolvePreferredProvider(decrypted), "openai");
});

test("AI provider masking keeps a short preview only", () => {
  assert.equal(maskApiKey("openai", "sk-proj-1234567890abcd"), "sk-****abcd");
  assert.equal(maskApiKey("gemini", "AIza1234567890xyz"), "AIza****0xyz");
});

test("AI provider bundle preserves provider priority", () => {
  let bundle = createEmptyAiProviderBundle();
  bundle = upsertProviderIntoBundle(bundle, "gemini", "AIza-gemini-1111", "2026-05-31T00:00:00.000Z");
  bundle = upsertProviderIntoBundle(bundle, "openai", "sk-openai-2222", "2026-05-31T00:01:00.000Z");

  assert.equal(resolvePreferredProvider(bundle), "openai");
  assert.equal(getProviderCredentials(bundle, "gemini"), "AIza-gemini-1111");
});
