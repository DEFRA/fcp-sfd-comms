import { addHours, addMinutes } from 'date-fns'

const isServerErrorCode = (code) => {
  return code >= 500 && code <= 599
}

const checkRetryable = (status, requestTime) => {
  if (!retryableStatus.includes(status)) {
    return false
  }

  if (status === notifyStatus.TECHNICAL_FAILURE) {
    return true
  }

  const adjustedNow = addMinutes(
    new Date(),
    notifyConfig.get('messageRetries.retryDelay')
  )

  const timeoutDate = addHours(
    requestTime,
    notifyConfig.get('messageRetries.temporaryFailureTimeout')
  )

  return adjustedNow < timeoutDate
}

export {
  isServerErrorCode,
  checkRetryable
}
