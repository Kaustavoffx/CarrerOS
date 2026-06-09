import assert from "node:assert/strict";
import test from "node:test";
import { getDistanceKm, getCommunityResources, SEEDED_RESOURCES } from "../lib/community-db";

test("Distance utility correctly calculates km distance between coordinates", () => {
  // Test distance between New Delhi (28.6139, 77.2090) and Bangalore (12.9716, 77.5946)
  // Distance should be approximately ~1740 km
  const dist = getDistanceKm(28.6139, 77.2090, 12.9716, 77.5946);
  assert.ok(dist > 1700 && dist < 1800, `Expected ~1740km, got ${dist}km`);

  // Distance between Mumbai (19.0760, 72.8777) and Pune (18.5204, 73.8567)
  // Distance should be approximately ~120 km
  const dist2 = getDistanceKm(19.0760, 72.8777, 18.5204, 73.8567);
  assert.ok(dist2 > 110 && dist2 < 130, `Expected ~120km, got ${dist2}km`);

  // Same coordinates should have 0 distance
  assert.equal(getDistanceKm(12.9716, 77.5946, 12.9716, 77.5946), 0);
});

test("Community resources proximity filtering successfully restricts results", async () => {
  // Query near Bangalore hub, radius 30km
  // Should return Bangalore opportunities (NIMHANS, Tech job fair, KVPY etc.)
  const blrResults = await getCommunityResources(null, {
    lat: 12.9716,
    lng: 77.5946,
    distance: 30
  });

  assert.ok(blrResults.length > 0);
  
  // Verify that the first elements returned are the ones in Bangalore (distance close to 0)
  const first = blrResults[0];
  assert.ok(first.distance_km! < 10);
  assert.ok(first.city === "Bangalore" || first.city === "Online");

  // Verify that far away resources (like Delhi) are filtered out when distance threshold is small
  const hasDelhi = blrResults.some(res => res.city === "New Delhi");
  assert.equal(hasDelhi, false, "Should filter out Delhi resources for small Bangalore radius");
});

test("Category and text query matching on community resources", async () => {
  // Filter by category: scholarship
  const scholarshipResults = await getCommunityResources(null, {
    type: "scholarship"
  });

  assert.ok(scholarshipResults.length > 0);
  scholarshipResults.forEach((res) => {
    assert.equal(res.type, "scholarship");
  });

  // Filter by keyword: "Coursera"
  const searchResults = await getCommunityResources(null, {
    searchQuery: "Coursera"
  });

  assert.ok(searchResults.length > 0);
  assert.ok(searchResults.some(res => res.name.includes("Google Career Certificates")));
});

test("Seeded community resources have visibility engine metadata", () => {
  const nos = SEEDED_RESOURCES.find(r => r.id === "res-nos");
  assert.ok(nos);
  assert.equal(nos.deadline, "2026-08-31");
  assert.ok(Array.isArray(nos.strict_requirements) && nos.strict_requirements.length > 0);
  assert.ok(Array.isArray(nos.application_steps) && nos.application_steps.length > 0);

  const googleCert = SEEDED_RESOURCES.find(r => r.id === "res-google-cert");
  assert.ok(googleCert);
  assert.equal(googleCert.deadline, "2026-12-31");
});
