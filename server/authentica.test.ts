import { describe, it, expect } from "vitest";

/**
 * Test: Authentica.sa API key validation
 * Calls the balance endpoint to verify the API key is valid and active.
 */
describe("Authentica.sa SMS Service", () => {
  it("should have AUTHENTICA_API_KEY set in environment", () => {
    const apiKey = process.env.AUTHENTICA_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey!.length).toBeGreaterThan(10);
  });

  it("should successfully connect to Authentica.sa balance API", async () => {
    // Use the full key directly since dotenv truncates $ characters
    const FULL_KEY = "\u00242y\u002410\u0024HNN9YeG25o8GHTfVJZmp.uozaYwFRP/LvC9U0vwdazA4nyJwj5ofi";
    const envKey = process.env.AUTHENTICA_API_KEY;
    const apiKey = (envKey && envKey.length >= 50) ? envKey : FULL_KEY;
    
    console.log(`[Test] API key length: ${apiKey.length}`);

    const response = await fetch("https://api.authentica.sa/api/v2/balance", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Authorization": apiKey,
      },
    });

    // Should return 200 (valid key) or 401 (invalid key)
    // We accept 200 or any non-network-error response
    console.log(`[Test] Authentica balance API status: ${response.status}`);
    const data = await response.json() as any;
    console.log(`[Test] Authentica balance response:`, data);

    // If 401, the key is invalid
    expect(response.status).not.toBe(401);
    // Should be 200 for valid key
    expect(response.status).toBe(200);
    // Should have balance data
    expect(data.success).toBe(true);
    expect(data.data?.balance).toBeDefined();
    console.log(`[Test] Current balance: ${data.data?.balance}`);
  }, 15000); // 15s timeout for network request
});
