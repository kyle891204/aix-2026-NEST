export function authReturnPath(value: unknown): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !value.startsWith('/login') &&
    !value.startsWith('/signup')
    ? value
    : '/'
}
