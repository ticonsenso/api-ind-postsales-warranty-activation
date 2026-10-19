import { toODataStringLiteral } from './odata-literal';

describe('toODataStringLiteral', () => {
  it('wraps the value in single quotes', () => {
    expect(toODataStringLiteral('0190072002001')).toBe("'0190072002001'");
  });

  it('doubles single quotes so the value cannot close the literal', () => {
    expect(toODataStringLiteral("x' or 1 eq 1 or Name eq '")).toBe("'x'' or 1 eq 1 or Name eq '''");
  });
});
