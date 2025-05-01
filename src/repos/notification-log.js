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
    const statusFields = ['status', 'error', 'notificationId']

    const update = {}

    for (const field of statusFields) {
      if (statusDetails[field]) {
        update[`statusDetails.${field}`] = statusDetails[field]
      }
    }

    await dbClient.collection(collection).updateOne(
      {
        'message.source': message.source,
        'message.id': message.id
      },
      {
        $set: {
          ...update,
          updatedAt: new Date(),
          completedAt: finishedStatus.includes(statusDetails.status) ? new Date() : null
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

    if (!notification) {
      return null
    }

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
const getPendingNotifications = async () => {
  try {
    const pendingNotifications = []

    const result = dbClient.collection(collection)
      .find({
        'statusDetails.status': {
          $nin: finishedStatus
        }
      })

    for await (const doc of result) {
      pendingNotifications.push(doc)
    }

    return pendingNotifications
  } catch (err) {
    throw new Error(`Error fetching pending notifications: ${err.message}`, {
      cause: err
    })
  }
}

export {
  addNotificationRequest,
  checkNotificationIdempotency,
  updateNotificationStatus,
  getOriginalNotificationRequest,
  getPendingNotifications
}
