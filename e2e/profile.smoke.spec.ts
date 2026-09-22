import { test, expect, Page } from '@playwright/test';
const user = { id: 'profile-user', name: '<b>Ada Example</b>', email: 'ada@example.test' };
async function setup(page: Page, data: () => { status: number; body: unknown }) {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'profile-test-token'));
  await page.route('**/api/**', async (route) => {
    if (new URL(route.request().url()).pathname === '/api/users/me') {
      expect(route.request().headers()['authorization']).toBe('Bearer profile-test-token');
      const result = data();
      return route.fulfill({ status: result.status, json: result.body });
    }
    return route.fulfill({ json: [] });
  });
}
for (const theme of ['light', 'dark']) {
  test(`read-only profile and account identity in ${theme}`, async ({ page }, info) => {
    let body = user;
    await setup(page, () => ({ status: 200, body }));
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
    await page.goto('/profile');
    const profile = page.locator('app-profile');
    await expect(profile.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    await expect(profile.locator('dd').first()).toHaveText(user.name);
    await expect(profile.locator('b, input, form')).toHaveCount(0);
    const menu = page.getByRole('button', { name: 'Account menu', exact: true });
    if (await menu.isVisible()) {
      await menu.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('menu')).toContainText(user.email);
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
    } else {
      await expect(page.getByRole('navigation', { name: 'Account navigation' })).toContainText(
        user.email,
      );
    }
    body = { ...user, name: 'Updated Account' };
    const refresh = profile.getByRole('button', { name: 'Refresh profile' });
    await refresh.focus();
    await page.keyboard.press('Enter');
    await expect(profile.locator('dd').first()).toHaveText(body.name);
    await expect(refresh).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath('profile-' + theme + '.png'), fullPage: true });
    if (await menu.isVisible()) {
      await menu.click();
      await expect(page.getByRole('menu')).toContainText(body.name);
      await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
    } else {
      await expect(page.getByRole('navigation', { name: 'Account navigation' })).toContainText(
        body.name,
      );
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    }
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(body.name, { exact: true })).toHaveCount(0);
  });
}
for (const status of [403, 404, 500]) {
  test(`refresh ${status} clears identity and supports retry`, async ({ page }) => {
    let result = { status: 200, body: user as unknown };
    await setup(page, () => result);
    await page.goto('/profile');
    const profile = page.locator('app-profile');
    const refresh = profile.getByRole('button', { name: 'Refresh profile' });
    await expect(profile.locator('dd').first()).toHaveText(user.name);
    result = { status, body: {} };
    await refresh.click();
    await expect(profile.getByRole('alert')).toBeVisible();
    await expect(page.getByText(user.name, { exact: true })).toHaveCount(0);
    result = { status: 200, body: user };
    await refresh.click();
    await expect(profile.locator('dd').first()).toHaveText(user.name);
    result = { status: 401, body: {} };
    await refresh.click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(user.email, { exact: true })).toHaveCount(0);
  });
}
test('pending refresh disables duplicate requests and account replacement hides identity', async ({
  page,
}) => {
  await setup(page, () => ({ status: 200, body: user }));
  await page.goto('/profile');
  const profile = page.locator('app-profile');
  await expect(profile.locator('dd').first()).toHaveText(user.name);
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/users/me', async (route) => {
    await barrier;
    await route.fulfill({ json: user });
  });
  const refresh = profile.getByRole('button', { name: 'Refresh profile' });
  await refresh.click();
  await expect(refresh).toBeDisabled();
  await expect(profile.getByRole('status')).toContainText('Loading');
  await expect(page.getByText(user.email, { exact: true })).toHaveCount(0);
  release();
  await expect(refresh).toBeEnabled();
  const other = await page.context().newPage();
  await other.goto('/config.js');
  await other.evaluate(() => localStorage.setItem('accessToken', 'replacement-token'));
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(user.email, { exact: true })).toHaveCount(0);
  await other.close();
});
