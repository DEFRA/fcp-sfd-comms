import { createLogger } from '../../../../../logging/logger.js'

import { notifyStatuses } from '../../../../../constants/notify-statuses.js'

import { updateNotificationStatus } from '../../../../../repos/notification-log.js'
import { publishStatus } from '../../../../outbound/notification-status/publish-status.js'

const logger = createLogger()

const processNotifySuccess = async (message, recipient, response) => {
  try {
    await updateNotificationStatus(message, {
      notificationId: response.data.id,
      status: notifyStatuses.SENDING
    })

    await publishStatus(message, recipient, notifyStatuses.SENDING, null)
  } catch (error) {
    logger.error(error, `Error processing gov notify success response for message: ${message.source}-${message.id}`)
  }
}

export { processNotifySuccess }
