function formatEntry(level: string, message: string, context?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (key === "error" && value instanceof Error) {
        entry.errorMessage = value.message
        entry.errorStack = value.stack
      } else {
        entry[key] = value
      }
    }
  }

  return JSON.stringify(entry)
}

export const logger = {
  error(message: string, context?: Record<string, unknown>): void {
    console.error(formatEntry("error", message, context))
  },
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(formatEntry("warn", message, context))
  },
  info(message: string, context?: Record<string, unknown>): void {
    console.log(formatEntry("info", message, context))
  },
}
