import { notifyStatuses } from './notify-statuses.js'

export const commsEvents = {
  REQUEST: 'uk.gov.fcp.sfd.notification.request',
  RECEIVED: 'uk.gov.fcp.sfd.notification.received',
  RETRY: 'uk.gov.fcp.sfd.notification.retry',
  SENDING: 'uk.gov.fcp.sfd.notification.sending',
  DELIVERED: 'uk.gov.fcp.sfd.notification.delivered',
  VALIDATION_FAILURE: 'uk.gov.fcp.sfd.notification.failure.validation',
  INTERNAL_FAILURE: 'uk.gov.fcp.sfd.notification.failure.internal',
  PROVIDER_FAILURE: 'uk.gov.fcp.sfd.notification.failure.provider'
}

export const statusToEventMap = {
  [notifyStatuses.PERMANENT_FAILURE]: commsEvents.PROVIDER_FAILURE,
  [notifyStatuses.TEMPORARY_FAILURE]: commsEvents.PROVIDER_FAILURE,
  [notifyStatuses.TECHNICAL_FAILURE]: commsEvents.PROVIDER_FAILURE,
  [notifyStatuses.VALIDATION_FAILURE]: commsEvents.VALIDATION_FAILURE,
  [notifyStatuses.INTERNAL_FAILURE]: commsEvents.INTERNAL_FAILURE,
  [notifyStatuses.DELIVERED]: commsEvents.DELIVERED,
  [notifyStatuses.SENDING]: commsEvents.SENDING,
  [notifyStatuses.CREATED]: commsEvents.SENDING
}
