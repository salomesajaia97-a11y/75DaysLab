import { describe, it, expect } from 'vitest'
import { validateRegister, isValidEmail, normalizeEmail } from './auth'

describe('normalizeEmail', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com')
  })
  it('lowercases the address', () => {
    expect(normalizeEmail('User@EXAMPLE.CoM')).toBe('user@example.com')
  })
  it('trims and lowercases together', () => {
    expect(normalizeEmail('\t  Foo.Bar@Mail.Com \n')).toBe('foo.bar@mail.com')
  })
})

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
  })
  it('accepts subdomains and plus tags', () => {
    expect(isValidEmail('a.b+tag@mail.co.uk')).toBe(true)
  })
  it('rejects a bare string with no @', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
  })
  it('rejects missing domain', () => {
    expect(isValidEmail('user@')).toBe(false)
  })
  it('rejects missing local part', () => {
    expect(isValidEmail('@example.com')).toBe(false)
  })
  it('rejects domain without TLD dot', () => {
    expect(isValidEmail('user@localhost')).toBe(false)
  })
  it('rejects internal whitespace', () => {
    expect(isValidEmail('us er@example.com')).toBe(false)
  })
  it('rejects an over-long address (> 254 chars)', () => {
    const long = 'a'.repeat(250) + '@x.com'
    expect(isValidEmail(long)).toBe(false)
  })
})

describe('validateRegister', () => {
  const goodPw = 'password123'

  it('accepts a valid payload and returns normalized values', () => {
    const r = validateRegister({ username: '  Alice ', email: '  Alice@Example.COM ', password: goodPw })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.email).toBe('alice@example.com')
      expect(r.value.username).toBe('Alice')
      expect(r.value.password).toBe(goodPw)
    }
  })

  it('rejects a malformed email with a 400-style error', () => {
    const r = validateRegister({ username: 'bob', email: 'not-an-email', password: goodPw })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('email')
  })

  it('rejects a missing email', () => {
    const r = validateRegister({ username: 'bob', email: undefined, password: goodPw })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('email')
  })

  it('rejects an empty / whitespace-only email', () => {
    const r = validateRegister({ username: 'bob', email: '   ', password: goodPw })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('email')
  })

  it('normalizes whitespace around an otherwise valid email', () => {
    const r = validateRegister({ username: 'bob', email: '  bob@example.com  ', password: goodPw })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.email).toBe('bob@example.com')
  })

  it('normalizes uppercase email to lowercase', () => {
    const r = validateRegister({ username: 'bob', email: 'BOB@EXAMPLE.COM', password: goodPw })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.email).toBe('bob@example.com')
  })

  it('rejects an over-long email', () => {
    const r = validateRegister({ username: 'bob', email: 'a'.repeat(250) + '@x.com', password: goodPw })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('email')
  })

  it('rejects a missing username', () => {
    const r = validateRegister({ username: '   ', email: 'bob@example.com', password: goodPw })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('username')
  })

  it('rejects a short password (< 8 chars)', () => {
    const r = validateRegister({ username: 'bob', email: 'bob@example.com', password: 'short' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('password')
  })

  it('rejects a missing password', () => {
    const r = validateRegister({ username: 'bob', email: 'bob@example.com', password: undefined })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('password')
  })

  it('accepts a valid password at the 8-char boundary', () => {
    const r = validateRegister({ username: 'bob', email: 'bob@example.com', password: '12345678' })
    expect(r.ok).toBe(true)
  })

  it('does not leak the password value in any error message', () => {
    const r = validateRegister({ username: 'bob', email: 'bob@example.com', password: 'topsecret' })
    // valid here, but assert error path never echoes password for the short case
    const bad = validateRegister({ username: 'bob', email: 'bob@example.com', password: 'x' })
    expect(r.ok).toBe(true)
    if (!bad.ok) expect(bad.error).not.toContain('x')
  })
})
