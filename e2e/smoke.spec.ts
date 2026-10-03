import { expect, test } from "@playwright/test";

test("home loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Ember/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("adding a menu item shows it in the cart", async ({ page }) => {
  await page.goto("/menu");

  await page.getByRole("button", { name: /View Classic Smash Burger/ }).click();

  const modal = page.getByRole("dialog", { name: "Classic Smash Burger" });
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: "Add to Cart" }).click();

  // Adding shows a toast instead of forcing the drawer open; open it from there.
  await page.getByRole("button", { name: "View cart" }).first().click();
  const cart = page.getByRole("dialog", { name: "Your Cart" });
  await expect(cart).toBeVisible();
  await expect(cart.getByText("Classic Smash Burger")).toBeVisible();
});

test("checkout reaches the review step", async ({ page }) => {
  await page.goto("/menu");
  await page.getByRole("button", { name: /View Classic Smash Burger/ }).click();
  const modal = page.getByRole("dialog", { name: "Classic Smash Burger" });
  await modal.getByRole("button", { name: "Add to Cart" }).click();

  await page.getByRole("button", { name: "View cart" }).first().click();
  await page.getByRole("dialog", { name: "Your Cart" }).getByRole("link", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // Step 1: fulfillment — pickup skips the delivery address form. The
  // button's accessible name also includes its description paragraph.
  await page.getByRole("button", { name: /^Pickup/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2: customer info (each step panel animates in; wait for it)
  await expect(page.getByLabel("Full Name")).toBeVisible();
  await page.getByLabel("Full Name").fill("Jordan Rivera");
  await page.getByLabel("Phone Number").fill("(555) 123-4567");
  await page.getByLabel("Email").fill("jordan@example.com");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3: pickup location
  await page.getByRole("group", { name: "Choose a pickup location" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4: payment — cash skips card validation entirely
  await page.getByRole("button", { name: "Pay at pickup" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 5: review
  await expect(page.getByRole("heading", { name: "Review your order" })).toBeVisible();
});
