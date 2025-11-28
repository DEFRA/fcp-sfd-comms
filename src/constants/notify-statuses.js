export const notifyStatuses = {
  CREATED: 'created',
  SENDING: 'sending',
  DELIVERED: 'delivered',
  PERMANENT_FAILURE: 'permanent-failure',
  TEMPORARY_FAILURE: 'temporary-failure',
  TECHNICAL_FAILURE: 'technical-failure',
  INTERNAL_FAILURE: 'internal-failure',
  VALIDATION_FAILURE: 'validation-failure' // when its a invalid sqs message, we should move this into finishedStatuses as well because it means it has failed notify validation eg it doesnt have a valid notify template_id.
}

// pendingStatuses 
// we could consider setting a status of pending when we first create the document in the db instead of leaving status as undefined


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
