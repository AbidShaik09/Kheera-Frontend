import { TaskDetail } from '../services/task-service';
import { task } from './board-fixtures';
import { SPACE } from './space-fixtures';
export const TYPE = { id: '00000000-0000-4000-8000-000000000041', name: 'Task', icon: null };
export const MEMBER = {
  id: '00000000-0000-4000-8000-000000000051',
  user: { id: '00000000-0000-4000-8000-000000000061', name: 'Ada', email: 'ada@example.test' },
  role: { id: '00000000-0000-4000-8000-000000000071', name: 'Member' },
};
export const TASK: TaskDetail = {
  ...task(),
  spaceId: SPACE.id,
  description: 'Keep description',
  efforts: 1,
  typeId: TYPE.id,
  typeName: TYPE.name,
  parentId: null,
  assigneeMemberId: MEMBER.id,
  assigneeName: 'Ada',
  assigneeActive: true,
  plannedStartDate: '2026-10-07T10:00:00.123456Z',
  plannedEndDate: null,
  actualStartDate: null,
  actualEndDate: null,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-07T00:00:00Z',
};
