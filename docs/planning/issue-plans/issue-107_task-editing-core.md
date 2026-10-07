# Issue #107: Core Task Details and editing

This is the independently deliverable core slice of parent #65. The implementation scope, acceptance-to-test mapping, ordered steps, architecture and validation are recorded in the [initial #65 plan](issue-65_task-details.md), committed as 7261b16 before application/tests on verified develop fb774c3359929d4c2405132b9b13b288bc01d098.

Issue #107 was extracted during delivery on 2026-10-07 because #65 also contains comments/uploads with unavailable backend contracts, while frontend policy requires PR closing keywords. No implementation scope changed. This additional plan records that timing honestly; no tests/code preceded the original committed plan. Keep both plans in the PR; Closes #107 and Refs #65. Parent #65 remains open for #90/#91/#92 coordination.

- [x] Core requirements and initial plan committed before code under #65.
- [x] Typed service, UUID routes/editor, parent/member searches, children, sparse edits/date precision and deletion implemented.
- [x] Focused tests and first full verify passed; access-loss self-review regression failed then fixed.
- [x] Disposable real frontend/backend smoke passed CRUD, assignment, hierarchy, server 400/409, persisted precision, reload and board refresh.
- [ ] Final full unit/integration/production/browser gates after access-loss repair.
- [ ] PR to develop, attach, request Codex review, inspect CI and repair findings.
- [ ] Merge/deployment awaits owner authorization.