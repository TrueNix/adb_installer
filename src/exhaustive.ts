export class UnexpectedVariantError extends Error {
  constructor(value: never) {
    super(`Unexpected variant: ${String(value)}`)
    this.name = "UnexpectedVariantError"
  }
}

export function assertNever(value: never): never {
  throw new UnexpectedVariantError(value)
}
