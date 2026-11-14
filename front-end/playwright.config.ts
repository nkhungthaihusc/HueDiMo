import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_BACKEND_URL: "http://127.0.0.1:3101",
      NEXT_PUBLIC_GOONG_API_KEY: "playwright",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3102",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "playwright",
    },
  },
});
