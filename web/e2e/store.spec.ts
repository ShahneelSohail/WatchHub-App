import { expect, test } from '@playwright/test';
import { logIn, placeCashOrder } from './helpers';

test('visitors can browse, search and open a watch', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Discover' })).toBeVisible();

  await page.goto('/watches');
  await expect(page.getByRole('heading', { name: 'All watches' })).toBeVisible();
  await page.getByPlaceholder('Name, brand or keyword').fill('Lunar');
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

  await expect(page.getByRole('heading', { name: `Order #${orderId}` })).toBeVisible();
  await expect(page.getByText('Thank you! Your order has been placed.')).toBeVisible();
  await page.goto('/orders');
  await expect(page.getByRole('link', { name: new RegExp(`Order #${orderId}`) })).toBeVisible();

  await page.goto(`/orders/${orderId}`);
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await expect(page.getByText('Your order was cancelled.')).toBeVisible();
});

test('an order moves from checkout to delivery and the buyer can then review the watch', async ({ browser }) => {
  const customer = await (await browser.newContext()).newPage();
  const admin = await (await browser.newContext()).newPage();
  await logIn(customer, 'omar@watchhub.test');
  await logIn(admin, 'admin@watchhub.test');

  const orderId = await placeCashOrder(customer, 'Tidal Force');

  await admin.goto(`/admin/orders/${orderId}`);
  await admin.getByRole('button', { name: 'Mark as confirmed' }).click();
  await expect(admin.getByRole('button', { name: 'Mark as shipped' })).toBeVisible();
  await admin.getByLabel('Courier').fill('DHL Express');
  await admin.getByLabel('Tracking number').fill('E2E-TRACK-1');
  await admin.getByRole('button', { name: 'Mark as shipped' }).click();
  await expect(admin.getByRole('button', { name: 'Mark as delivered' })).toBeVisible();
  await admin.getByRole('button', { name: 'Mark as delivered' }).click();
  await expect(admin.getByText('Order is now delivered.')).toBeVisible();

  await customer.goto(`/orders/${orderId}`);
  await expect(customer.getByText('E2E-TRACK-1')).toBeVisible();
  await expect(customer.getByText('Delivered').first()).toBeVisible();

  await customer.goto('/watches?q=Tidal');
  await customer.getByRole('link', { name: /Tidal Force/ }).click();
  await customer.getByLabel('Your review').fill('Great watch, survived the shower and the gym.');
  await customer.getByRole('button', { name: 'Post review' }).click();
  await expect(customer.getByText('Thanks for your review.')).toBeVisible();
  await expect(customer.getByText('Great watch, survived the shower and the gym.')).toBeVisible();
});
