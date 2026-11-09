import { expect, type Page } from '@playwright/test';

export const PASSWORD = process.env.SEED_PASSWORD ?? 'WatchHub123!';

export const logIn = async (page: Page, email: string) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'));
};

export const placeCashOrder = async (page: Page, watchName: string): Promise<string> => {
  await page.goto(`/watches?q=${encodeURIComponent(watchName)}`);
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('link', { name: new RegExp(watchName) }).click();
  await expect(page.getByRole('heading', { name: new RegExp(watchName) })).toBeVisible();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Add to bag' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Bag' })).toBeVisible();
  await page.goto('/checkout');
  await page.getByRole('radio', { name: /Cash on delivery/ }).click();
  await page.getByRole('button', { name: /Place order/ }).click();
  await page.waitForURL(/\/checkout\/result\?order=\d+&status=cod/);
  return new URL(page.url()).searchParams.get('order')!;
};
