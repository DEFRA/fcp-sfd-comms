import { createLogger } from '../../../../../logging/logger.js'
import { updateNotificationStatus } from '../../../../../repos/notification-log.js'
import { publishStatus } from '../../../../outbound/notification-status/publish-status.js'
import { notifyStatuses } from '../../../../../constants/notify-statuses.js'

const logger = createLogger()

const processNotifySuccess = async (message, recipient, response) => {
  try {

    const status = response.statusText.toLowerCase()

    await updateNotificationStatus(message, recipient, status ,null, response.data.id)

    await publishStatus(message, recipient, status)
  } catch (err) {
    logger.error(`Failed checking notification status: ${err.message}`)
  }
}

export { processNotifySuccess }
