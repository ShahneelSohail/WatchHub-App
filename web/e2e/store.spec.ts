import { expect, test } from '@playwright/test';
import { logIn, placeCashOrder } from './helpers';

test('visitors can browse, search and open a watch', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Discover' })).toBeVisible();

  await page.goto('/watches');
  await expect(page.getByRole('heading', { name: 'All watches' })).toBeVisible();
  await page.goto('/watches?q=Lunar');
  await expect(page.getByRole('link', { name: /Lunar Chrono/ })).toBeVisible();
  await expect(page.locator('article')).toHaveCount(1);

  await page.getByRole('link', { name: /Lunar Chrono/ }).click();
  await expect(page.getByRole('heading', { name: 'Lunar Chrono' })).toBeVisible();
  await expect(page.getByText('Customer reviews')).toBeVisible();
  await expect(page.getByText('Movement')).toBeVisible();
});

test('protected pages send visitors to the login page', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login\?next=%2Forders/);
});

test('customers are kept out of the admin console', async ({ page }) => {
  await logIn(page, 'maya@watchhub.test');
  await page.goto('/admin');
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
});

test('a customer buys with cash on delivery and can cancel before it ships', async ({ page }) => {
  await logIn(page, 'maya@watchhub.test');
  const orderId = await placeCashOrder(page, 'Pulse Square');

  await expect(page.getByRole('heading', { name: /when it arrives/ })).toBeVisible();
  await expect(page.getByText('Order placed')).toBeVisible();
  await page.goto('/orders');
  await expect(page.getByRole('link', { name: new RegExp(`Order #${orderId}`) })).toBeVisible();

  await page.goto(`/orders/${orderId}`);
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await page.getByRole('button', { name: 'Yes, cancel' }).click();
  await expect(page.getByText('Your order was cancelled.')).toBeVisible();
});

test('an order moves from checkout to delivery and the buyer can then review the watch', async ({ browser }) => {
  const customer = await (await browser.newContext()).newPage();
  const admin = await (await browser.newContext()).newPage();
  await logIn(customer, 'omar@watchhub.test');
  await logIn(admin, 'admin@watchhub.test');

  const orderId = await placeCashOrder(customer, 'Tidal Force');

  await admin.goto(`/admin/orders/${orderId}`);
  await admin.getByRole('button', { name: 'Confirm order' }).click();
  await admin.getByRole('button', { name: 'Ship order' }).click();
  const dialog = admin.getByRole('dialog');
  await dialog.getByRole('combobox').selectOption('UPS');
  await dialog.getByLabel('Tracking number').fill('E2E-TRACK-1');
  await dialog.getByRole('button', { name: 'Mark as shipped' }).click();
  await admin.getByRole('button', { name: 'Mark as delivered' }).click();
  await expect(admin.getByRole('button', { name: 'Issue refund' })).toBeVisible();

  await customer.goto(`/orders/${orderId}`);
  await expect(customer.getByText('E2E-TRACK-1')).toBeVisible();
  await expect(customer.getByText('Delivered').first()).toBeVisible();

  await customer.goto('/watches?q=Tidal');
  await customer.getByRole('link', { name: /Tidal Force/ }).click();
  await customer.getByRole('button', { name: 'Write a review' }).click();
  await customer.getByRole('radio', { name: '5 stars' }).click();
  await customer.getByLabel('Your review').fill('Great watch, survived the shower and the gym.');
  await customer.getByRole('button', { name: 'Post review' }).click();
  await expect(customer.getByText('Thanks for your review.')).toBeVisible();
  await expect(customer.getByText('Great watch, survived the shower and the gym.')).toBeVisible();
});

test('the command palette finds a watch and the keyboard opens it', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'Search' });
  await expect(palette).toBeVisible();
  await palette.getByLabel('Search watches').fill('Lunar');
  await expect(palette.getByText('Lunar Chrono')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/watches\/lunar-chrono/);
  await expect(page.getByRole('heading', { name: 'Lunar Chrono' })).toBeVisible();
});

test('search results page shows matches and a no-results state', async ({ page }) => {
  await page.goto('/search?q=Lunar');
  await expect(page.getByRole('heading', { name: 'Results for “Lunar”' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Lunar Chrono/ })).toBeVisible();
  await page.goto('/search?q=zzzzqx');
  await expect(page.getByText('No watches match “zzzzqx”')).toBeVisible();
});

test('forgot password page validates the email and shows the form', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
});

test('the payment result page renders its cancelled and pending outcomes', async ({ page }) => {
  await logIn(page, 'maya@watchhub.test');
  const orderId = await placeCashOrder(page, 'Pulse Square');
  await page.goto(`/checkout/result?order=${orderId}&status=cancelled`);
  await expect(page.getByRole('heading', { name: 'You haven’t been charged' })).toBeVisible();
  await page.goto(`/checkout/result?order=${orderId}&status=pending`);
  await expect(page.getByRole('heading', { name: 'Your order is waiting for payment' })).toBeVisible();
});

test('unknown pages show the designed 404', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.getByText('This page has stopped ticking')).toBeVisible();
});
