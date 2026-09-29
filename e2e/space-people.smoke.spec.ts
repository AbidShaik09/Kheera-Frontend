import { test, expect, Page } from '@playwright/test';
import { SPACE } from '../src/app/testing/space-fixtures';
const role = { id: '33333333-3333-3333-3333-333333333333', name: 'Contributor' };
const secondRole = { id: '55555555-5555-5555-5555-555555555555', name: 'Reader' };
const member = {
  id: '22222222-2222-2222-2222-222222222222',
  user: { id: '44444444-4444-4444-4444-444444444444', name: 'Alex', email: 'alex@example.test' },
  role,
};
async function setup(page: Page, denied = false, self = false) {
  let failure = '';
  let removed = false;
  const writes: { method: string; path: string; body: unknown }[] = [];
  await page.addInitScript(() => localStorage.setItem('accessToken', 'people-browser'));
  await page.route('**/api/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname,
      method = request.method();
    if (path === '/api/users/me')
      return route.fulfill({
        json: self ? member.user : { ...member.user, id: '66666666-6666-6666-6666-666666666666' },
      });
    if (path === '/api/spaces')
      return route.fulfill({ json: removed && self ? [] : [{ id: SPACE.id, name: SPACE.name }] });
    if (path === `/api/spaces/${SPACE.id}`) return route.fulfill({ json: SPACE });
    if (method !== 'GET') {
      writes.push({ method, path, body: request.postData() ? request.postDataJSON() : null });
      if (failure)
        return route.fulfill({
          status: failure === 'FORBIDDEN' ? 403 : 409,
          json: { code: failure },
        });
      if (method === 'DELETE') {
        removed = true;
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({ status: method === 'POST' ? 201 : 200, json: member });
    }
    if (denied) return route.fulfill({ status: 403, json: {} });
    const size = Number(url.searchParams.get('size')),
      index = Number(url.searchParams.get('page'));
    let items: unknown[] = path.endsWith('/roles')
      ? [role, secondRole]
      : path.endsWith('/permissions')
        ? [{ ...role, name: 'space.members.read' }]
        : removed
          ? []
          : [member];
    const totalItems =
      path.endsWith('/members') && !removed && !url.searchParams.get('q') ? 26 : items.length;
    if (totalItems === 26 && index === 0)
      items = Array.from({ length: 25 }, (_, i) =>
        i === 0
          ? member
          : {
              ...member,
              id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
              user: { ...member.user, name: `Person ${i}` },
            },
      );
    return route.fulfill({
      json: { items, page: index, size, totalItems, totalPages: Math.ceil(totalItems / size) },
    });
  });
  return { writes, fail: (code: string) => (failure = code) };
}
for (const theme of ['light', 'dark']) {
  test(`People search, pagination, role, add and removal in ${theme}`, async ({ page }, info) => {
    const state = await setup(page);
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto(`/spaces/${SPACE.id}/people`);
    const panel = page.locator('app-space-people');
    await expect(panel.getByRole('heading', { name: 'Members (26)' })).toBeVisible();
    await panel.getByRole('button', { name: 'Next page' }).click();
    await expect(panel.getByText('Page 2 of 2')).toBeVisible();
    await panel.getByLabel('Search name or email').fill('Alex');
    await panel.getByRole('button', { name: 'Search', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(panel.getByRole('heading', { name: 'Members (1)' })).toBeVisible();
    await panel.getByLabel('Role for Alex', { exact: true }).selectOption(secondRole.id);
    await panel.getByRole('button', { name: 'Save role for Alex' }).click();
    await expect(panel.getByText('Role updated.', { exact: true })).toBeVisible();
    expect(state.writes[0].path).toBe(`/api/spaces/${SPACE.id}/members/${member.id}`);
    await panel.getByLabel('Account email').fill('new@example.test');
    await panel.getByLabel('Role for new member').selectOption(role.id);
    state.fail('DUPLICATE_MEMBERSHIP');
    await panel.getByRole('button', { name: 'Add existing user', exact: true }).click();
    await expect(panel.getByText('This user already belongs to this space.')).toBeVisible();
    await expect(panel.getByLabel('Account email')).toHaveValue('new@example.test');
    state.fail('');
    await panel.getByRole('button', { name: 'Add existing user', exact: true }).click();
    await expect(panel.getByText('Member added.', { exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'Remove Alex', exact: true }).click();
    await expect(panel.getByRole('heading', { name: 'Remove Alex?' })).toBeFocused();
    await panel.getByRole('button', { name: 'Cancel removal' }).click();
    await expect(panel.getByRole('button', { name: 'Remove Alex', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    state.fail('LAST_ADMINISTRATOR');
    await panel.getByRole('button', { name: 'Confirm removal' }).click();
    await expect(panel.getByText('At least one active administrator must remain.')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`people-${theme}.png`), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    state.fail('');
    await panel.getByRole('button', { name: 'Confirm removal' }).click();
    await expect(panel.getByText('Membership removed.', { exact: true })).toBeVisible();
    await expect(panel.getByText('No members on this page.')).toBeVisible();
  });
}
test('denied directory preserves space identity with honest unavailable states', async ({
  page,
}) => {
  await setup(page, true);
  await page.goto(`/spaces/${SPACE.id}/people`);
  const panel = page.locator('app-space-people');
  await expect(panel.getByRole('link', { name: 'Engineering' })).toBeVisible();
  await expect(panel.getByRole('alert').first()).toContainText('You do not have permission');
  await expect(panel.getByLabel('Account email')).toHaveCount(0);
});
test('self removal revokes local space context', async ({ page }) => {
  await setup(page, false, true);
  await page.goto(`/spaces/${SPACE.id}/people`);
  const panel = page.locator('app-space-people');
  await panel.getByRole('button', { name: 'Remove Alex', exact: true }).click();
  await panel.getByRole('button', { name: 'Confirm removal' }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('app-space-people')).toHaveCount(0);
});
