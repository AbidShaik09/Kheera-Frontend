export const SPACE = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Engineering',
  description: 'Build together',
  profilePic: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-20T00:00:00Z',
  capabilities: { canUpdate: true, canDelete: true, canManageMembers: true },
};
export const PROJECT = {
  id: '00000000-0000-4000-8000-000000000011',
  spaceId: SPACE.id,
  name: 'Website',
  description: 'Public website',
  sprintCycleDays: 7,
  progressPercent: 45,
  openTaskCount: 8,
  updatedAt: '2026-09-20T00:00:00Z',
};
export const projectPage = (items = [PROJECT]) => ({
  items,
  page: 0,
  size: 12,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
});
