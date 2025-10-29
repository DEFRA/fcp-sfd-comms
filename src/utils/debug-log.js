import { createLogger } from '../logging/logger.js'

const logger = createLogger()
const protectedKeys = new Set(['recipient', 'personalisation', 'content', 'subject', 'body'])
let nestedObject = false

const redactObjectsProperties = (sensitiveObject) => {
  for (const key of Object.keys(sensitiveObject)) {
    if (protectedKeys.has(key) || nestedObject) {
      if (typeof sensitiveObject[key] === 'string') {
        // if the value is a string overwrite it to redact the data
        const val = sensitiveObject[key]
        sensitiveObject[key] = `${val.slice(0, 2)}*****`
      }

      if (typeof sensitiveObject[key] === 'object') {
        // if the value is another object recursivly call the function to redact the nested properties
        // nestedObject flag is needed to account for nested properties not being in the protected keys set.
        nestedObject = true
        redactObjectsProperties(sensitiveObject[key])
        nestedObject = false
      }
    }
  }
}

const sanitiseMessage = (message) => {
  const { data } = message

  redactObjectsProperties(data)

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

  logger.debug(JSON.stringify(sanitiseMessage(message)))
}

export { debugLog }
