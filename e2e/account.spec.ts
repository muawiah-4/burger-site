import { expect, test } from "@playwright/test";

test("sign up, place an order, and see it in Orders after a reload", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  // Sign up from the navbar account button.
  await page.goto("/menu");
  const accountButton = page.getByTestId("navbar-account");
  await expect(accountButton).toHaveAttribute("data-signed-in", "false");
  await accountButton.click();
  const dialog = page.getByRole("dialog", { name: "Ember Account" });
  await dialog.getByRole("button", { name: "Create an account" }).click();
  await dialog.getByLabel("Name (optional)").fill("Casey Ember");
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Password").fill("charred onion stack 42");
  await dialog.getByRole("button", { name: "Create account" }).click();
  await expect(dialog.getByTestId("account-status")).toHaveText(`Signed in as ${email}`);
  await expect(accountButton).toHaveAttribute("data-signed-in", "true");
  await page.keyboard.press("Escape");

  // Order (pickup + cash); contact details pre-fill from the account.
  await page.getByRole("button", { name: /View Classic Smash Burger/ }).click();
  await page.getByRole("dialog", { name: "Classic Smash Burger" }).getByRole("button", { name: "Add to Cart" }).click();
  await page.getByRole("button", { name: "View cart" }).first().click();
  await page.getByRole("dialog", { name: "Your Cart" }).getByRole("link", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await page.getByRole("button", { name: /^Pickup/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Full Name")).toHaveValue("Casey Ember");
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await page.getByLabel("Phone Number").fill("(555) 123-4567");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("group", { name: "Choose a pickup location" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Pay at pickup" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Place Order/ }).click();
  await expect(page).toHaveURL(/\/order\/[0-9a-f-]{36}/);
  const orderId = /\/order\/([0-9a-f-]{36})/.exec(page.url())![1];

  // A fresh load (session from the cookie): the order is listed from the server.
  await page.reload();
  await page.getByTestId("navbar-account").click();
  const after = page.getByRole("dialog", { name: "Ember Account" });
  await expect(after.getByTestId("account-status")).toHaveText(`Signed in as ${email}`);
  await expect(after.getByRole("link", { name: /Track Order Live/ })).toHaveAttribute("href", new RegExp(orderId));

  // And the owner can read it without the token.
  const res = await page.request.get(`/api/orders/${orderId}`);
  expect(res.status()).toBe(200);
});
