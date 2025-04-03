import { addHours, addMinutes } from 'date-fns'

import { config } from '../config/index.js'

import { notifyStatuses } from '../constants/notify-statuses.js'

const isServerErrorCode = (code) => {
  return code >= 500 && code <= 599
}

const checkRetryWindow = (status, requestTime) => {
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
  checkRetryWindow
}
