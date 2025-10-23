import dbClient from '../db-client.js'
import { createIndex } from '../create-index.js'

export const setupNotificationIndexes = async () => {
  const notificationRequestsCollection = dbClient.collection('notificationRequests')

  await createIndex(notificationRequestsCollection, { 'message.id': 1 }, 'message_id_index', true)
  await createIndex(notificationRequestsCollection, { 'message.source': 1 }, 'message_source_index')
  await createIndex(notificationRequestsCollection, { 'message.id': 1, 'message.source': 1 }, 'message_id_source_index', true)
}
