import { addHours, addMinutes } from 'date-fns'

import { config } from '../config/index.js'

import { notifyStatuses, retryableStatus } from '../constants/notify-statuses.js'

const isServerErrorCode = (code) => {
  return code >= 500 && code <= 599
}

const checkRetryable = (status, requestTime) => {
  if (!retryableStatus.includes(status)) {
    return false
  }

  if (status === notifyStatuses.TECHNICAL_FAILURE) {
    return true
  }

  const adjustedNow = addMinutes(
    new Date(),
    config.get('notify.retries.retryDelay')
  )

  const timeoutDate = addHours(
    requestTime,
    config.get('notify.retries.temporaryFailureTimeout')
  )

  return adjustedNow < timeoutDate
}

export {
  isServerErrorCode,
  checkRetryable
}
