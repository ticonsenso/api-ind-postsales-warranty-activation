import { InvalidRequestError } from '../errors/invalid-request.error';
import { assertUuid } from './assert-uuid';

describe('assertUuid', () => {
  it('accepts a UUID', () => {
    expect(() => {
      assertUuid('5b3c2f1e-8a4d-4c6b-9e2f-1a7d3b5c9e01', 'INVALID_CLIENT_ID');
    }).not.toThrow();
  });

  it('rejects anything else with the given code', () => {
    expect(() => {
      assertUuid('not-a-uuid', 'INVALID_CLIENT_ID');
    }).toThrow(InvalidRequestError);
    expect(() => {
      assertUuid('not-a-uuid', 'INVALID_CLIENT_ID');
    }).toThrow(expect.objectContaining({ code: 'INVALID_CLIENT_ID' }));
  });
});
