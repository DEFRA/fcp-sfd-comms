import dbClient from '../db/db-client.js'

import { MongoError, UUID } from 'mongodb'

import { finishedStatus, notifyStatuses } from '../constants/notify-statuses.js'
import { DatabaseError } from '../errors/database-errors.js'

const collection = 'notificationRequests'

const addNotificationRequest = async (message) => {
  try {
    const notification = {
      _id: new UUID(),
      message,
      createdAt: new Date(),
      statusDetails: {
        status: notifyStatuses.PENDING_PUBLISH
      }
    }

    await dbClient.collection(collection).insertOne(notification)
  } catch (error) {
    if (error instanceof MongoError) {
      throw new DatabaseError(
        `Error adding notification request for ${message.source}-${message.id}`,
        {
          name: error.name,
          code: error.code
        }
      )
    }

    throw error
  }
}

const checkNotificationIdempotency = async (message) => {
  try {
    const notification = await dbClient.collection(collection).findOne({
      'message.id': message.id,
      'message.source': message.source
    })

    return notification != null
  } catch (error) {
    if (error instanceof MongoError) {
      throw new DatabaseError(
        `Error checking idempotency token ${message.source}-${message.id}`,
        {
          name: error.name,
          code: error.code
        }
      )
    }

    throw error
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
  } catch (error) {
    if (error instanceof MongoError) {
      throw new DatabaseError(
        `Error updating notification status for ${message.source}-${message.id}`,
        {
          name: error.name,
          code: error.code
        }
      )
    }

    throw error
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
  } catch (error) {
    if (error instanceof MongoError) {
      throw new DatabaseError(
        `Error finding original notification for correlation id ${correlationId}`,
        {
          name: error.name,
          code: error.code
        }
      )
    }

    throw error
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

    return pendingNotifications.map((n) => ({
      id: n._id,
      message: n.message,
      statusDetails: n.statusDetails,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt
    }))
  } catch (error) {
    if (error instanceof MongoError) {
      throw new DatabaseError(
        'Error fetching pending notifications',
        {
          name: error.name,
          code: error.code
        }
      )
    }

    throw error
  }
}

export {
  addNotificationRequest,
  checkNotificationIdempotency,
  updateNotificationStatus,
  getOriginalNotificationRequest,
  getPendingNotifications
}
