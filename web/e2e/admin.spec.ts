import { expect, test } from '@playwright/test';
import { logIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await logIn(page, 'admin@watchhub.test');
});

test('the dashboard summarises the store', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Revenue, last 14 days')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent orders' })).toBeVisible();
});

test('an admin creates a draft product, publishes it and finds it in the store', async ({ page }) => {
  const name = `E2E Chronograph ${Date.now()}`;
  await page.goto('/admin/products/new');
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('SKU').fill(`E2E-${Date.now()}`);
  await page.getByLabel('Brand').selectOption({ index: 1 });
  await page.getByLabel('Category').selectOption({ index: 1 });
  await page.getByLabel('Description').fill('Created by the end-to-end test.');
  await page.getByLabel('Price (USD)').fill('450');
  await page.getByLabel('Units in stock').fill('5');
  await page.getByLabel(/^Status/).selectOption('DRAFT');
  await page.getByRole('button', { name: 'Save product' }).click();
  await page.waitForURL('**/admin/products');

  await page.goto('/watches?q=E2E+Chronograph');
  await expect(page.getByText('No watches match your filters')).toBeVisible();

  await page.goto('/admin/products');
  await page.getByLabel('Search products').fill(name);
  await page.getByRole('link', { name }).click();
  await expect(page.getByRole('heading', { name: `Edit ${name}` })).toBeVisible();
  await page.getByLabel(/^Status/).selectOption('PUBLISHED');
  await page.getByRole('button', { name: 'Save product' }).click();
  await page.waitForURL('**/admin/products');

  await page.goto(`/watches?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();

  await page.goto('/admin/products');
  await page.getByLabel('Search products').fill(name);
  await expect(page.getByRole('row')).toHaveCount(2);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Product deleted.')).toBeVisible();
});

test('an admin adds and removes a coupon', async ({ page }) => {
  const code = `E2E${Date.now()}`.slice(0, 14);
  await page.goto('/admin/coupons');
  await page.getByRole('button', { name: 'Add coupon' }).click();
  await page.getByLabel('Code').fill(code);
  await page.getByLabel('Value').fill('15');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(code)).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('row', { name: new RegExp(code) }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Coupon deleted.')).toBeVisible();
});
