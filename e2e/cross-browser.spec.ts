import type { Page } from "@playwright/test";
import { expect, expectFocusInside, expectHydrated, test } from "./fixtures";

// Broad smoke over the key flows, run in Chromium and WebKit (see
// playwright.config.ts). The fixture fails any test that logs a console error,
// throws, or trips the Content-Security-Policy.

async function openProduct(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(`^View ${name}`) }).first().click();
  const modal = page.getByRole("dialog", { name });
  await expect(modal).toBeVisible();
  return modal;
}

/** Adds a burger with default options and opens the cart drawer from the toast. */
async function addBurgerAndOpenCart(page: Page) {
  await page.goto("/menu");
  const modal = await openProduct(page, "Classic Smash Burger");
  await modal.getByRole("button", { name: /Add to Cart/ }).click();
  await page.getByTestId("cart-toast").getByRole("button", { name: "View cart" }).click();
  const cart = page.getByRole("dialog", { name: "Your Cart" });
  await expect(cart).toBeVisible();
  return cart;
}

test("menu: category, search, dietary and allergen filters", async ({ page }) => {
  await page.goto("/menu");
  const burger = page.getByRole("button", { name: /^View Classic Smash Burger/ });
  const fries = page.getByRole("button", { name: /^View Classic Fries/ });
  await expect(burger).toBeVisible();

  const pizza = page.getByRole("button", { name: "Pizza", exact: true });
  await pizza.click();
  await expect(pizza).toHaveAttribute("aria-pressed", "true");
  await expect(burger).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^View Margherita/ })).toBeVisible();
  await page.getByRole("button", { name: "All", exact: true }).click();

  await page.getByRole("searchbox", { name: "Search menu" }).fill("fries");
  await expect(fries).toBeVisible();
  await expect(burger).toHaveCount(0);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(burger).toBeVisible();

  const veg = page.getByRole("button", { name: "Vegetarian", exact: true });
  await veg.click();
  await expect(veg).toHaveAttribute("aria-pressed", "true");
  await expect(burger).toHaveCount(0);
  await veg.click();

  // Allergen filter hides everything containing gluten; plain fries stay.
  const allergens = page.getByRole("group", { name: "Hide items with…" });
  await allergens.getByRole("button", { name: "Gluten" }).click();
  await expect(allergens.getByRole("button", { name: "Gluten" })).toHaveAttribute("aria-pressed", "true");
  await expect(burger).toHaveCount(0);
  await expect(fries).toBeVisible();
});

test("product modal options change the price and reach the cart", async ({ page }) => {
  await page.goto("/menu");
  const modal = await openProduct(page, "Classic Smash Burger");
  const add = modal.getByRole("button", { name: /Add to Cart/ });
  const before = await add.textContent();

  await modal.getByRole("radio", { name: /Double Patty/ }).click();
  await expect(modal.getByRole("radio", { name: /Double Patty/ })).toHaveAttribute("aria-checked", "true");
  await expect(modal.getByRole("radio", { name: /Single Patty/ })).toHaveAttribute("aria-checked", "false");
  await modal.getByRole("checkbox", { name: /Crispy Bacon/ }).click();
  await expect(modal.getByRole("checkbox", { name: /Crispy Bacon/ })).toHaveAttribute("aria-checked", "true");
  await expect(add).not.toHaveText(before ?? "");

  await add.click();
  await expect(modal).toBeHidden();
  const toast = page.getByTestId("cart-toast");
  await expect(toast).toContainText("Classic Smash Burger");
  await toast.getByRole("button", { name: "View cart" }).click();

  const cart = page.getByRole("dialog", { name: "Your Cart" });
  await expect(cart.getByText("Double Patty")).toBeVisible();
  await expect(cart.getByText("Crispy Bacon")).toBeVisible();
});

test("cart drawer: quantity, promo codes through the quote API, remove", async ({ page }) => {
  const cart = await addBurgerAndOpenCart(page);

  await cart.getByRole("button", { name: "Increase quantity" }).click();
  await expect(page.getByRole("button", { name: "Cart, 2 items" }).first()).toBeAttached();

  const promo = cart.getByRole("textbox", { name: "Promo code" });
  await promo.fill("nope");
  await cart.getByRole("button", { name: "Apply" }).click();
  await expect(cart.getByText("That code isn't valid.")).toBeVisible();

  await promo.fill("crave10");
  const quote = page.waitForResponse((r) => r.url().includes("/api/quote") && r.ok());
  await cart.getByRole("button", { name: "Apply" }).click();
  await quote;
  await expect(cart.getByText("10% off your order")).toBeVisible();
  await expect(cart.getByText("Discount")).toBeVisible();

  await cart.getByRole("button", { name: "Remove Classic Smash Burger" }).click();
  await expect(cart.getByText("Your cart is empty")).toBeVisible();
});

test("checkout: validation, delivery, schedule, tip, place order, order page", async ({ page }) => {
  // A fixed midday in the locations' time zone, so "order for later" always
  // has slots whatever time the suite runs. Timers keep running.
  await page.clock.setFixedTime(new Date("2026-10-02T19:00:00Z"));
  const cart = await addBurgerAndOpenCart(page);
  await cart.getByRole("link", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/checkout/);

  const next = page.getByRole("button", { name: "Continue" });

  // Step 1: fulfillment + schedule
  await page.getByRole("button", { name: /^Delivery/ }).click();
  await page.getByRole("radiogroup", { name: "When" }).getByRole("radio", { name: /Schedule for later/ }).click();
  const slot = page.locator("#checkout-schedule");
  await expect(slot).toBeVisible();
  const second = await slot.locator("option").nth(1).getAttribute("value");
  await slot.selectOption(second!);
  await next.click();

  // Step 2: customer — empty submit shows errors and focuses the first field.
  // Each step panel animates in, so wait for it before pressing Continue.
  const name = page.getByLabel("Full Name");
  await expect(name).toBeVisible();
  await next.click();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toBeFocused();
  await name.fill("Jordan Rivera");
  await page.getByLabel("Phone Number").fill("(555) 123-4567");
  await page.getByLabel("Email").fill("not-an-email");
  await next.click();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Email").fill("jordan@example.com");
  await next.click();

  // Step 3: delivery address
  await expect(page.getByLabel("Street Address")).toBeVisible();
  await next.click();
  await expect(page.getByLabel("Street Address")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Street Address").fill("412 Market Street");
  await page.getByLabel("City").fill("San Francisco");
  await page.getByLabel("ZIP Code").fill("94105");
  await next.click();

  // Step 4: card payment — an incomplete number is rejected
  await expect(page.getByLabel("Name on Card")).toBeVisible();
  await page.getByLabel("Name on Card").fill("Jordan Rivera");
  await page.getByLabel("Card Number").fill("4242 4242");
  await page.getByLabel("Expiry (MM/YY)").fill("12/34");
  await page.getByLabel("CVC").fill("123");
  await next.click();
  await expect(page.getByLabel("Card Number")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Card Number").fill("4242 4242 4242 4242");
  await next.click();

  // Step 5: review — schedule shows, tip changes the total
  await expect(page.getByRole("heading", { name: "Review your order" })).toBeVisible();
  await expect(page.getByText(/Scheduled for .+ today/)).toBeVisible();
  const place = page.getByRole("button", { name: /Place Order/ });
  const totalBefore = await place.textContent();
  const tips = page.getByRole("radiogroup", { name: /Driver tip/i });
  await tips.getByRole("radio", { name: /^15%/ }).click();
  await expect(tips.getByRole("radio", { name: /^15%/ })).toHaveAttribute("aria-checked", "true");
  await expect(place).not.toHaveText(totalBefore ?? "");

  // The scheduled slot is in the (fake) past for the real server clock, so go ASAP.
  await page.clock.setFixedTime(new Date());
  await page.getByRole("button", { name: "Edit Fulfillment" }).click();
  await page.getByRole("radiogroup", { name: "When" }).getByRole("radio", { name: /ASAP/ }).click();
  await page.getByRole("button", { name: "Save & Review" }).click();
  await expect(page.getByRole("heading", { name: "Review your order" })).toBeVisible();
  await expect(place).toBeVisible();

  const created = page.waitForResponse((r) => r.url().endsWith("/api/orders") && r.request().method() === "POST");
  await place.click();
  expect((await created).status()).toBe(201);
  await expect(page).toHaveURL(/\/order\//);
  await expect(page.getByRole("heading", { name: "ORDER CONFIRMED" })).toBeVisible();
  await expect(page.getByText("San Francisco, 94105")).toBeVisible();

  // The order page survives a reload (loaded back from the API).
  await page.reload();
  await expect(page.getByRole("heading", { name: "ORDER CONFIRMED" })).toBeVisible();
  await expect(page.getByText("San Francisco, 94105")).toBeVisible();
});

test("account: tabs, sign up, signed-in tabs, sign out", async ({ page }) => {
  await page.goto("/");
  const accountButton = page.getByRole("banner").getByRole("button", { name: /^Account, signed out/ });
  await accountButton.click();
  const account = page.getByRole("dialog", { name: "Ember Account" });
  await expectFocusInside(account);
  for (const tab of ["Orders", "Details", "Rewards", "Sign In"]) {
    const button = account.getByRole("button", { name: new RegExp(`^${tab}`) });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }

  // A fresh account per run (and per browser), so parallel runs never collide.
  const email = `xb-${test.info().project.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await account.getByRole("button", { name: "Create an account" }).click();
  const form = account.getByRole("form", { name: "Create account" });
  await form.getByLabel("Name (optional)").fill("Jordan Rivera");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password").fill("correct-horse-battery-9");
  const signup = page.waitForResponse((r) => r.url().endsWith("/api/auth/signup"));
  await form.getByRole("button", { name: "Create account" }).click();
  expect((await signup).ok()).toBe(true);

  for (const tab of ["Profile", "Security", "Rewards", "Orders"]) {
    const button = account.getByRole("button", { name: new RegExp(`^${tab}`) });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await page.keyboard.press("Escape");
  await expect(account).toBeHidden();

  // The session cookie survives a reload (WebKit drops Secure cookies on http://localhost).
  await page.reload();
  const signedIn = page.getByRole("banner").getByRole("button", { name: /^Account, signed in as Jordan Rivera/ });
  await expect(signedIn).toBeVisible();
  await signedIn.click();
  await expectFocusInside(account);
  await account.getByRole("button", { name: "Security" }).click();
  await account.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("banner").getByRole("button", { name: /^Account, signed out/ })).toBeVisible();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("mobile menu opens, navigates and closes", async ({ page }) => {
    await page.goto("/");
    const open = page.getByRole("button", { name: "Open menu" });
    await expectHydrated(open);
    await open.click();
    const menu = page.getByRole("dialog", { name: "MENU" });
    await expectFocusInside(menu);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(open).toBeFocused();

    await open.click();
    await menu.getByRole("link", { name: "Menu", exact: true }).click();
    await expect(page).toHaveURL(/\/menu$/);
    await expect(menu).toBeHidden();
  });
});

test("focus returns to the clicked trigger when a dialog closes (Safari focus-on-click)", async ({ page }) => {
  await page.goto("/menu");
  const trigger = page.getByRole("button", { name: /^View Classic Smash Burger/ }).first();
  await expectHydrated(trigger);
  // A real mouse click: Safari doesn't focus a button it clicks.
  await trigger.click();
  const modal = page.getByRole("dialog", { name: "Classic Smash Burger" });
  await expectFocusInside(modal);
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(trigger).toBeFocused();

  const account = page.getByRole("banner").getByRole("button", { name: /^Account, signed out/ });
  await expectHydrated(account);
  await account.click();
  await expectFocusInside(page.getByRole("dialog", { name: "Ember Account" }));
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
});
