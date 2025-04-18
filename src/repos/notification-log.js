import dbClient from '../db/db-client.js'

const collection = 'notificationRequests'

const addNotificationRequest = async (message) => {
  try {
    const notification = {
      message,
      createdAt: new Date()
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

const updateNotificationStatus = async (message, recipient, status, error) => {
  try {
    await dbClient.collection(collection).updateOne(
      {
        'message.id': message.id
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
                    updatedAt: new Date(),
                    ...(error && { error })
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

export {
  addNotificationRequest,
  checkNotificationIdempotency,
  updateNotificationStatus,
  getOriginalNotificationRequest
}
