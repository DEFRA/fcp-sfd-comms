import dbClient from '../db/db-client.js'

import { finishedStatus, notifyStatuses } from '../constants/notify-statuses.js'

const collection = 'notificationRequests'

const addNotificationRequest = async (message) => {
  try {
    const notification = {
      message,
      createdAt: new Date(),
      statusDetails: {
        status: notifyStatuses.CREATED
      }
    }

    await dbClient.collection(collection).insertOne(notification)
  } catch (err) {
    throw new Error(`Error logging notification request: ${err.message}`, {
      cause: err
    })
  }
}

const checkNotificationIdempotency = async (message) => {
  try {
    const notification = await dbClient.collection(collection).findOne({
      'message.id': message.id,
      'message.source': message.source
    })

    return notification != null
  } catch (err) {
    throw new Error(`Error checking idempotency token: ${err.message}`, {
      cause: err
    })
  }
}

const updateNotificationStatus = async (message, statusDetails) => {
  try {
    const notification = await dbClient.collection(collection).findOne({
      'message.source': message.source,
      'message.id': message.id
    })

    if (!notification) {
      throw new Error(`Notification not found for message id: ${message.id}`)
    }

    const existingStatus = notification.statusDetails

    const { status, error, notificationId } = statusDetails

    await dbClient.collection(collection).updateOne(
      {
        'message.source': message.source,
        'message.id': message.id
      },
      {
        $set: {
          statusDetails: {
            notificationId: notificationId ?? existingStatus.notificationId,
            status: status ?? existingStatus.status,
            error: error ?? existingStatus.error
          },
          updatedAt: new Date(),
          completedAt: finishedStatus.includes(status) ? new Date() : null
        }
      }
    )
  } catch (err) {
    throw new Error(`Error updating notification status for message id: ${message.id}`, {
      cause: err
    })
  }
}

const getOriginalNotificationRequest = async (source, correlationId) => {
  try {
    const notification = await dbClient.collection(collection).findOne({
      'message.source': source,
      'message.id': correlationId
    })

    return {
      id: notification.message.id,
      createdAt: notification.createdAt
    }
  } catch (err) {
    throw new Error(`Error finding original notification for correlationId: ${correlationId}`, {
      cause: err
    })
  }
}

export {
  addNotificationRequest,
  checkNotificationIdempotency,
  updateNotificationStatus,
  getOriginalNotificationRequest
}
