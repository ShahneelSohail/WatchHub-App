import { expect, test, type Browser } from '@playwright/test';
import { PASSWORD, logIn } from './helpers';

const PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const placeCashOrderViaApi = async (browser: Browser, baseURL: string): Promise<number> => {
  const { request } = await browser.newContext({ baseURL });
  await request.post('/api/auth/login', { data: { email: 'omar@watchhub.test', password: PASSWORD } });
  const [watch] = (await (await request.get('/api/watches?q=Tidal')).json()).data as { id: number }[];
  await request.post('/api/cart', { data: { watchId: watch!.id, quantity: 1 } });
  const [address] = (await (await request.get('/api/addresses')).json()).data as { id: number }[];
  const checkout = await request.post('/api/checkout', { data: { addressId: address!.id, shippingMethod: 'STANDARD', paymentMethod: 'COD' } });
  return (await checkout.json()).data.order.id;
};

test.beforeEach(async ({ page }) => {
  await logIn(page, 'admin@watchhub.test');
});

test('the dashboard summarises the store', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Revenue, last 7 days' })).toBeVisible();
  await expect(page.getByText('Recent orders', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: '30 days' }).click();
  await expect(page.getByRole('heading', { name: 'Revenue, last 30 days' })).toBeVisible();
});

test('the theme toggle switches to dark, persists across a reload and switches back', async ({ page }) => {
  await page.goto('/admin');
  await page.getByRole('radio', { name: 'dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('radio', { name: 'light' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
});

test('an admin creates a draft product, publishes it and finds it in the store', async ({ page }) => {
  const name = `E2E Chronograph ${Date.now()}`;
  await page.goto('/admin/products/new');
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Reference').fill(`E2E-${Date.now()}`);
  await page.getByLabel('Description').fill('Created by the end-to-end test.');
  await page.getByLabel('Price', { exact: true }).fill('450');
  await page.getByRole('button', { name: 'Create product' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'before saving' })).toContainText('Add at least one image');

  await page.getByLabel('Upload images').setInputFiles({ name: 'watch.png', mimeType: 'image/png', buffer: PIXEL_PNG });
  await expect(page.getByAltText('Product image 1')).toBeVisible();
  await page.getByRole('button', { name: '+ Add colour' }).click();
  await page.getByLabel('Stock for New colour').fill('5');
  await page.getByRole('button', { name: 'Create product' }).click();
  await page.waitForURL(/\/admin\/products\/\d+$/);

  await page.goto(`/watches?q=${encodeURIComponent(name)}`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);

  await page.goto('/admin/products');
  await page.getByLabel('Search', { exact: true }).fill(name);
  await page.getByRole('row', { name: new RegExp(name) }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await page.getByLabel('Status').selectOption('PUBLISHED');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Product saved').first()).toBeVisible();

  await page.goto(`/watches?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();

  await page.goto('/admin/products');
  await page.getByLabel('Search', { exact: true }).fill(name);
  await page.getByRole('row', { name: new RegExp(name) }).click();
  await page.getByRole('button', { name: 'Delete product' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete product' }).click();
  await page.waitForURL('**/admin/products');
  await expect(page.getByText(`${name} deleted`)).toBeVisible();
});

test('an admin adds and removes a coupon', async ({ page }) => {
  const code = `E2E${Date.now()}`.slice(0, 14);
  await page.goto('/admin/coupons');
  await page.getByRole('button', { name: '+ New coupon' }).click();
  await page.getByLabel('Code').fill(code);
  await page.getByLabel('Value').fill('15');
  await page.getByLabel('Usage limit').fill('50');
  await page.getByRole('button', { name: 'Create coupon' }).click();
  await expect(page.getByRole('row', { name: new RegExp(code) })).toBeVisible();

  await page.getByRole('row', { name: new RegExp(code) }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete coupon' }).click();
  await expect(page.getByText(`${code} deleted`)).toBeVisible();
});

test('an order is confirmed, shipped with tracking, delivered and partly refunded', async ({ browser, page, baseURL }) => {
  const orderId = await placeCashOrderViaApi(browser, baseURL!);

  await page.goto(`/admin/orders/${orderId}`);
  await page.getByRole('button', { name: 'Confirm order' }).click();
  await page.getByRole('button', { name: 'Ship order' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Mark as shipped' }).click();
  await expect(dialog.getByText('Enter the tracking number from the courier label')).toBeVisible();
  await dialog.getByRole('combobox').selectOption('UPS');
  await dialog.getByLabel('Tracking number').fill('E2E-TRACK-1');
  await dialog.getByRole('button', { name: 'Mark as shipped' }).click();
  await expect(page.getByText('E2E-TRACK-1')).toBeVisible();

  await page.getByRole('button', { name: 'Mark as delivered' }).click();
  await expect(page.getByRole('button', { name: 'Issue refund' })).toBeVisible();
  await page.getByRole('button', { name: 'Issue refund' }).click();
  await dialog.getByLabel('Amount').fill('10');
  await dialog.getByRole('button', { name: 'Issue refund' }).click();
  await expect(page.getByText('Net payment')).toBeVisible();

  await page.goto('/admin/refunds');
  await expect(page.getByRole('row', { name: new RegExp(`#${orderId}`) })).toBeVisible();
});

test('inventory adjustments are saved with a reason', async ({ page }) => {
  await page.goto('/admin/inventory');
  const field = page.getByRole('textbox', { name: /^Stock for/ }).first();
  const original = Number(await field.inputValue());
  await field.fill(String(original + 3));
  await expect(page.getByText('1 unsaved adjustment')).toBeVisible();
  await page.getByRole('button', { name: 'Save adjustments' }).click();
  await expect(page.getByText('Stock updated for 1 SKU')).toBeVisible();
  await expect(field).toHaveValue(String(original + 3));

  await field.fill(String(original));
  await page.getByRole('button', { name: 'Save adjustments' }).click();
  await expect(field).toHaveValue(String(original));
});
