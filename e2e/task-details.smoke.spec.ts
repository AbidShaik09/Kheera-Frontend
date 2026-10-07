import { test, expect, Page } from '@playwright/test';
import { SPACE, PROJECT } from '../src/app/testing/space-fixtures';
import { STAGES, boardPage } from '../src/app/testing/board-fixtures';
import { TASK, TYPE, MEMBER } from '../src/app/testing/task-fixtures';
async function setup(page: Page, update = true, efforts: number | null = 1) {
  let task = { ...TASK, efforts },
    exists = true,
    failure = 0,
    readFailure = 0;
  const writes: { method: string; path: string; body: Record<string, unknown> | null }[] = [];
  await page.addInitScript(() => localStorage.setItem('accessToken', 'task-browser'));
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname,
      method = req.method();
    if (path === '/api/users/me')
      return route.fulfill({
        json: { id: 'test-user', name: 'Test User', email: 'user@example.test' },
      });
    if (path === '/api/spaces')
      return route.fulfill({ json: [{ id: SPACE.id, name: SPACE.name }] });
    if (path === `/api/spaces/${SPACE.id}`)
      return route.fulfill({
        json: { ...SPACE, capabilities: { ...SPACE.capabilities, canUpdate: update } },
      });
    if (path === `/api/projects/${PROJECT.id}`) return route.fulfill({ json: PROJECT });
    if (path.endsWith('/workflow-stages')) return route.fulfill({ json: STAGES });
    if (path.endsWith('/work-item-types')) return route.fulfill({ json: [TYPE] });
    if (path.endsWith('/members'))
      return route.fulfill({
        json: { items: [MEMBER], page: 0, size: 25, totalItems: 1, totalPages: 1 },
      });
    if (path.includes('/work-items') && method !== 'GET') {
      const body = req.postData() ? req.postDataJSON() : null;
      writes.push({ method, path, body });
      if (failure)
        return route.fulfill({
          status: failure,
          json:
            failure === 409
              ? { code: 'TASK_HAS_CHILDREN' }
              : failure === 400
                ? { fieldErrors: { parentId: 'Task hierarchy cannot contain a cycle.' } }
                : {},
        });
      if (method === 'DELETE') {
        exists = false;
        return route.fulfill({ status: 204 });
      }
      task = { ...task, ...body };
      exists = true;
      return route.fulfill({ status: method === 'POST' ? 201 : 200, json: task });
    }
    if (path === `/api/work-items/${TASK.id}`)
      return route.fulfill({
        status: readFailure || (!exists ? 404 : 200),
        json: readFailure ? {} : task,
      });
    if (path === `/api/projects/${PROJECT.id}/work-items`) {
      const items = url.searchParams.has('parentId') ? [] : exists ? [task] : [];
      return route.fulfill({ json: boardPage(items) });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return { writes, fail: (s: number) => (failure = s), failRead: (s: number) => (readFailure = s) };
}
for (const theme of ['light', 'dark'])
  test(`task edit, clear, keyboard and deletion in ${theme}`, async ({ page }, info) => {
    const state = await setup(page);
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto(`/work-items/${TASK.id}`);
    const editor = page.locator('app-task-details');
    await expect(editor.getByLabel('Title', { exact: true })).toHaveValue(TASK.title);
    await editor.getByLabel('Description', { exact: true }).fill('');
    await editor.getByLabel('Title', { exact: true }).fill('Changed task');
    await editor.getByRole('button', { name: 'Clear assignee', exact: true }).click();
    await editor.getByRole('button', { name: 'Save changes', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(editor.getByText('Task saved.', { exact: true })).toBeVisible();
    expect(state.writes[0].body).toEqual({
      title: 'Changed task',
      description: null,
      assigneeMemberId: null,
    });
    await page.reload();
    await expect(editor.getByLabel('Title', { exact: true })).toHaveValue('Changed task');
    await editor.getByRole('button', { name: 'Search members', exact: true }).click();
    await editor
      .getByRole('button', { name: 'Assign Ada (ada@example.test)', exact: true })
      .click();
    await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(editor.getByText('Task saved.', { exact: true })).toBeVisible();
    expect(state.writes[1].body).toEqual({ assigneeMemberId: MEMBER.id });
    await editor.getByRole('button', { name: 'Show children', exact: true }).click();
    await expect(editor.getByText('No child tasks.', { exact: true })).toBeVisible();
    await expect(
      editor.getByText('Comments are not available yet.', { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath(`task-${theme}.png`), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await editor.getByRole('button', { name: 'Delete task', exact: true }).click();
    await expect(
      editor.getByRole('button', { name: 'Cancel deletion', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(editor.getByRole('button', { name: 'Delete task', exact: true })).toBeFocused();
    await editor.getByRole('button', { name: 'Delete task', exact: true }).click();
    state.fail(409);
    await editor.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
    await expect(editor.getByRole('alert').first()).toContainText('children');
    state.fail(0);
    await editor.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
    await expect(page).toHaveURL(`/projects/${PROJECT.id}`);
    await expect(page.getByText('No tasks yet.', { exact: true })).toBeVisible();
  });
test('creates from the project board and opens the returned task UUID', async ({ page }) => {
  const state = await setup(page);
  await page.goto(`/projects/${PROJECT.id}`);
  await page.getByRole('link', { name: 'Create task', exact: true }).click();
  const editor = page.locator('app-task-details');
  await editor.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(editor.getByLabel('Title', { exact: true })).toBeFocused();
  await editor.getByLabel('Title', { exact: true }).fill('New task');
  await editor.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(page).toHaveURL(`/work-items/${TASK.id}`);
  expect(state.writes[0].body).toEqual({
    title: 'New task',
    efforts: 1,
    typeId: TYPE.id,
    stageId: STAGES[0].id,
  });
});
for (const status of [400, 401, 403, 404, 500])
  test(`task save handles ${status}`, async ({ page }) => {
    const state = await setup(page);
    await page.goto(`/work-items/${TASK.id}`);
    const editor = page.locator('app-task-details');
    await editor.getByLabel('Title', { exact: true }).fill('Retained draft');
    state.fail(status);
    await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
    if (status === 401) {
      await expect(page).toHaveURL('/login');
      return;
    }
    await expect(editor.getByRole('alert').first()).toBeVisible();
    if (status === 403 || status === 404) {
      await expect(editor.getByLabel('Title', { exact: true })).toHaveCount(0);
      return;
    }
    await expect(editor.getByLabel('Title', { exact: true })).toHaveValue('Retained draft');
    state.fail(0);
    await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(editor.getByText('Task saved.', { exact: true })).toBeVisible();
  });
test('read-only task and unavailable deep link', async ({ page }) => {
  const state = await setup(page, false);
  await page.goto(`/work-items/${TASK.id}`);
  const editor = page.locator('app-task-details');
  await expect(editor.getByLabel('Title', { exact: true })).toBeDisabled();
  await expect(editor.getByRole('button', { name: 'Delete task', exact: true })).toHaveCount(0);
  state.failRead(404);
  await page.reload();
  await expect(
    editor.getByText('This task or project is unavailable.', { exact: true }),
  ).toBeVisible();
  await expect(editor.getByLabel('Title', { exact: true })).toHaveCount(0);
});
test('keeps unset historical effort when another field changes', async ({ page }) => {
  const state = await setup(page, true, null);
  await page.goto(`/work-items/${TASK.id}`);
  const editor = page.locator('app-task-details');
  await expect(editor.getByLabel('Effort', { exact: true })).toHaveValue('');
  await editor.getByLabel('Title', { exact: true }).fill('Historical task');
  await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(editor.getByText('Task saved.', { exact: true })).toBeVisible();
  expect(state.writes[0].body).toEqual({ title: 'Historical task' });
});
