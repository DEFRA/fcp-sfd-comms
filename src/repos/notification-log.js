import dbClient from '../db/db-client.js'

const collection = 'notificationRequests'

const addNotificationRequest = async (message) => {
  try {
    const notification = {
      message
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

const updateNotificationStatus = async (message, status, recipient) => {
  try {
    const notification = await dbClient.collection(collection).updateOne(
      {
        'message.id': message.id
      },
      {
        $set: { [`status.${recipient}`]: status }
      }
    )
  } catch (err) {
    throw new Error(`Error updating notification status for messageId ${message.id}: ${err.message}`)
  }
}

export {
  addNotificationRequest,
  checkNotificationIdempotency,
  updateNotificationStatus
}
