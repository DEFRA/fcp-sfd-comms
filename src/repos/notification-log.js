import dbClient from '../db/db-client.js'
import { notifyStatuses } from '../constants/notify-statuses.js'

const collection = 'notificationRequests'

const addNotificationRequest = async (message) => {
  try {
    const recipient = message.data.recipient;
    
    const notification = {
      message,
      createdAt: new Date(),
      recipients: [{
        recipient,
        status: notifyStatuses.CREATED,
        completed: null,
        updatedAt: new Date()
      }]
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

const updateNotificationStatus = async (message, recipient, status, error, notificationId) => {
  try {
    await dbClient.collection(collection).updateOne(
      {
        'message.id': message.id,
        'message.source' : message.source 
      },
      [
        {
          $set: {
            recipients: {
              $concatArrays: [
                [
                  {
                    recipient,
                    status,
                    completed: (status !== notifyStatuses.CREATED && status !== notifyStatuses.SENDING) 
                      ? new Date() 
                      : null,
                    updatedAt: new Date(),
                    ...(error && { error }),
                    notificationId
                  }
                ],
                {
                  $ifNull: [
                    {
                      $filter: {
                        input: '$recipients',
                        as: 'r',
                        cond: {
                          $ne: [
                            '$$r.recipient',
                            recipient
                          ]
                        }
                      }
                    },
                    []
                  ]
                }
              ]
            }
          }
        }
      ]
    )
  } catch (err) {
    throw new Error(`Error updating notification status for message id: ${message.id}`, {
      cause: err
    })
  }
}

const getOriginalNotificationRequest = async (correlationId) => {
  try {
    const notification = await dbClient.collection(collection).findOne({
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
const getPendingNotifications = async () => {
  try {
    const pendingNotifications = await dbClient.collection(collection)
      .aggregate([
        { $match: { 'recipients.completed': null } },
        { $unwind: '$recipients' },
        { $project: {
          _id: 0,
          id: '$message.id',
          message: '$message',
          createdAt: 1,
          recipient: '$recipients.recipient',
          status: '$recipients.status',
          notificationId: '$recipients.notificationId'
        }}
      ])
      .toArray()
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
