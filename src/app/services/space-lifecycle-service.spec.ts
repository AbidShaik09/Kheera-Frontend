import { validateSpace, spacePayload } from './space-lifecycle-service';
import { SPACE } from '../testing/space-fixtures';
const draft = { name: '  New space  ', description: '', profilePic: '' };
describe('Space lifecycle payload and validation', () => {
  it('creates with trimmed name and omits blank optional fields', () => {
    expect(spacePayload(draft)).toEqual({ name: 'New space' });
  });
  it('patches only changed fields and clears optional values with null', () => {
    expect(spacePayload({ ...draft, name: SPACE.name }, SPACE)).toEqual({ description: null });
    expect(
      spacePayload({ name: SPACE.name, description: SPACE.description, profilePic: '' }, SPACE),
    ).toEqual({});
  });
  it('clears a profile picture with null and preserves description whitespace', () => {
    expect(
      spacePayload(
        { name: SPACE.name, description: '  ', profilePic: '' },
        { ...SPACE, profilePic: 'https://example.test/a' },
      ),
    ).toEqual({ description: '  ', profilePic: null });
  });
  it('counts Unicode code points after trimming name', () => {
    expect(validateSpace({ ...draft, name: '  ' }).name).toBeTruthy();
    expect(validateSpace({ ...draft, name: '😀'.repeat(255) })).toEqual({});
    expect(validateSpace({ ...draft, name: '😀'.repeat(256) }).name).toBeTruthy();
    expect(validateSpace({ ...draft, description: '😀'.repeat(501) }).description).toBeTruthy();
    expect(
      validateSpace({ ...draft, profilePic: 'https://example.test/' + 'a'.repeat(255) }).profilePic,
    ).toBeTruthy();
  });
  it.each([
    'javascript:alert(1)',
    '/a.png',
    'https://u:p@example.test/a',
    'https://@example.test/a',
    'https:example.test/a',
    'https://example.test/a b',
    'https://example.test/\\a',
  ])('rejects unsafe or nonabsolute URL %s', (profilePic) => {
    expect(validateSpace({ ...draft, profilePic }).profilePic).toBeTruthy();
  });
  it('accepts credential-free absolute HTTP(S) URLs', () => {
    expect(validateSpace({ ...draft, profilePic: 'https://example.test/a.png' })).toEqual({});
  });
});
