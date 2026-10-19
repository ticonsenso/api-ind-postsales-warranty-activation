import { resolveCorrelationId } from './resolve-correlation-id';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('resolveCorrelationId', () => {
  it('reuses a well-formed incoming id', () => {
    expect(resolveCorrelationId('req-123.abc_DEF')).toBe('req-123.abc_DEF');
  });

  it('uses the first value when the header is repeated', () => {
    expect(resolveCorrelationId(['first-id', 'second-id'])).toBe('first-id');
  });

  it.each([undefined, '', 'has spaces', 'line\nbreak', 'x'.repeat(65)])('generates a new id for %j', incoming => {
    expect(resolveCorrelationId(incoming)).toMatch(UUID_PATTERN);
  });
});
