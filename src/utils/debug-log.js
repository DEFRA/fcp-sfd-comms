import { createLogger } from '../logging/logger.js'

const logger = createLogger()
const protectedKeys = ['recipient', 'personalisation', 'content']

const sanitiseMessage = (message) => {
  const { data } = message

  for (const key of Object.keys(data)) {
    if (protectedKeys.includes(key)) {
      data[key] = 'redacted'
    }
  }

  return {
    ...message,
    data
  }
}

const debugLog = (message) => {
  if (!message.data) {
    logger.warn('Invalid message format for debug logger. Debug log not executed.')
    return
  }

  logger.debug(sanitiseMessage(message))
}

export { debugLog }
