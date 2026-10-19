import { expect, type Page } from '@playwright/test';

export const PASSWORD = process.env.SEED_PASSWORD ?? 'WatchHub123!';

export const logIn = async (page: Page, email: string) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'));
};

export const placeCashOrder = async (page: Page, watchName: string): Promise<string> => {
  await page.goto('/watches');
  await page.getByPlaceholder('Name, brand or keyword').fill(watchName);
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('link', { name: new RegExp(watchName) }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByText('Added to your cart.').waitFor();
  await page.goto('/checkout');
  await page.getByRole('radio', { name: /Cash on delivery/ }).click();
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.waitForURL(/\/orders\/\d+\?placed=1/);
  return page.url().match(/\/orders\/(\d+)/)![1]!;
};
