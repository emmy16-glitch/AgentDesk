import { expect, test } from "@playwright/test";

test("submission status is machine-readable without claiming a paid completion", async ({ request }) => {
  const response = await request.get("/api/submission/");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-agentdesk-proof-boundary"]).toBe("submission-status-not-job-proof");

  const body = await response.json() as {
    implementation?: Record<string, string>;
    openProofGates?: { realExternalPaidErc8183Job?: { status?: string } };
    evidenceBoundary?: string[];
    warning?: string;
  };

  expect(body.implementation?.fourCategoryDepth).toBe("complete");
  expect(body.implementation?.erc8183HiringFlow).toBe("implementation-complete");
  expect(body.openProofGates?.realExternalPaidErc8183Job?.status).toBe("open");
  expect(body.evidenceBoundary).toContain("independent-context-checked");
  expect(body.evidenceBoundary).toContain("completed");
  expect(body.warning).toContain("not proof");
});

test("judge proof page includes independent checks and Brain proof boundary", async ({ page }) => {
  await page.goto("/proof", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Every claim has a boundary." })).toBeVisible();
  await expect(page.getByText("Independent context checked", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explanation is not verification." })).toBeVisible();
  await expect(page.getByText(/cannot change an ERC-8004 identity state/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Open submission status JSON" })).toBeVisible();
  await expect(page.getByText(/not itself evidence that a particular external agent has been paid/i)).toBeVisible();
});
