import { describe, it, expect } from 'vitest'
import { constantTimeEqual, verifyBearerSecret, escapeRegex } from './security'

describe('constantTimeEqual', () => {
  it('is true for identical strings', () => {
    expect(constantTimeEqual('s3cr3t', 's3cr3t')).toBe(true)
  })

  it('is false for different strings of equal length', () => {
    expect(constantTimeEqual('aaaaaa', 'bbbbbb')).toBe(false)
  })

  it('is false (never throws) for different-length strings', () => {
    expect(constantTimeEqual('short', 'a-much-longer-value')).toBe(false)
  })

  it('is false when one side is empty', () => {
    expect(constantTimeEqual('', 'x')).toBe(false)
    expect(constantTimeEqual('x', '')).toBe(false)
  })
})

describe('verifyBearerSecret', () => {
  it('denies when the expected secret is undefined (no "Bearer undefined" bypass)', () => {
    expect(verifyBearerSecret('Bearer undefined', undefined)).toBe(false)
    expect(verifyBearerSecret('Bearer ', undefined)).toBe(false)
  })

  it('denies when the expected secret is an empty string', () => {
    expect(verifyBearerSecret('Bearer ', '')).toBe(false)
    expect(verifyBearerSecret('Bearer anything', '')).toBe(false)
  })

  it('denies when the Authorization header is missing', () => {
    expect(verifyBearerSecret(null, 'secret')).toBe(false)
    expect(verifyBearerSecret(undefined, 'secret')).toBe(false)
  })

  it('denies a malformed header (no Bearer prefix / empty token)', () => {
    expect(verifyBearerSecret('secret', 'secret')).toBe(false)
    expect(verifyBearerSecret('Basic secret', 'secret')).toBe(false)
    expect(verifyBearerSecret('Bearer', 'secret')).toBe(false)
    expect(verifyBearerSecret('Bearer ', 'secret')).toBe(false)
  })

  it('denies the wrong secret', () => {
    expect(verifyBearerSecret('Bearer wrong', 'secret')).toBe(false)
  })

  it('accepts the correct secret', () => {
    expect(verifyBearerSecret('Bearer secret', 'secret')).toBe(true)
  })
})

describe('escapeRegex', () => {
  it('escapes regex metacharacters so user input matches literally', () => {
    expect(escapeRegex('a.*b')).toBe('a\\.\\*b')
    expect(escapeRegex('(x)[y]{z}')).toBe('\\(x\\)\\[y\\]\\{z\\}')
    expect(escapeRegex('^$|?+')).toBe('\\^\\$\\|\\?\\+')
  })

  it('leaves ordinary text unchanged', () => {
    expect(escapeRegex('chicken salad')).toBe('chicken salad')
  })
})
