export const notifyStatuses = {
  CREATED: 'created',
  SENDING: 'sending',
  DELIVERED: 'delivered',
  PERMANENT_FAILURE: 'permanent-failure',
  TEMPORARY_FAILURE: 'temporary-failure',
  TECHNICAL_FAILURE: 'technical-failure',
  INTERNAL_FAILURE: 'internal-failure',
  VALIDATION_FAILURE: 'validation-failure'
}

export const finishedStatus = [
  notifyStatuses.DELIVERED,
  notifyStatuses.INTERNAL_FAILURE,
  notifyStatuses.TEMPORARY_FAILURE,
  notifyStatuses.PERMANENT_FAILURE,
  notifyStatuses.TECHNICAL_FAILURE
]

export const retryableStatus = [
  notifyStatuses.TEMPORARY_FAILURE,
  notifyStatuses.TECHNICAL_FAILURE
]
