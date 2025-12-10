import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import v1 from '../../../mocks/comms-request/v1.js'

import dbClient from '../../../../src/db/db-client.js'

import { clearCollection, getAllEntities } from '../../../helpers/mongo.js'
import {
  addNotificationRequest,
  checkNotificationIdempotency,
  getOriginalNotificationRequest,
  updateNotificationStatus,
  getPendingNotifications
} from '../../../../src/repos/notification-log.js'

describe('mongo notification request repository', () => {
  beforeEach(async () => {
    if (!dbClient.client.topology?.isConnected()) {
      await dbClient.client.connect()
    }

    await clearCollection('notificationRequests')
  })

  describe('add notification request', () => {
    beforeEach(async () => {
      if (!dbClient.client.topology?.isConnected()) {
        await dbClient.client.connect()
      }

      await clearCollection('notificationRequests')
    })

    test('should log a notification request', async () => {
      const mockMessage = {
        ...v1,
        id: '94449000-2b17-4f57-847a-66662e074f9f'
      }

      await addNotificationRequest(mockMessage)

      const notificationRequests = await getAllEntities('notificationRequests', {
        'message.source': mockMessage.source,
        'message.id': mockMessage.id
      })

      expect(notificationRequests).toHaveLength(1)
      expect(notificationRequests[0].message).toEqual(mockMessage)
      expect(notificationRequests[0].statusDetails.status).toEqual('pending-publish')
    })

    test('should throw error if connection fails', async () => {
      const mockMessage = {
        ...v1,
        id: '94449000-2b17-4f57-847a-66662e074f9f'
      }

      await dbClient.client.close()

      await expect(addNotificationRequest(mockMessage))
        .rejects
        .toMatchObject({
          message: `Error adding notification request for ${mockMessage.source}-${mockMessage.id}`,
          name: 'MongoNotConnectedError'
        })
    })
  })

  describe('get pending notifications', () => {
    beforeEach(async () => {
      if (!dbClient.client.topology?.isConnected()) {
        await dbClient.client.connect()
      }

      await clearCollection('notificationRequests')
    })

    test('should return notifications where completedAt is null', async () => {
      await addNotificationRequest({
        ...v1,
        id: '94449000-2b17-4f57-847a-66662e074f9f'
      })

      await addNotificationRequest({
        ...v1,
        id: 'dc1028c8-bdda-48b8-b7c8-49c72b7fd383'
      })

      await updateNotificationStatus({
        ...v1,
        id: 'dc1028c8-bdda-48b8-b7c8-49c72b7fd383'
      }, {
        notificationId: 'dc1028c8-bdda-48b8-b7c8-49c72b7fd383',
        status: 'created'
      })

      await updateNotificationStatus({
        ...v1,
        id: '94449000-2b17-4f57-847a-66662e074f9f'
      }, {
        notificationId: '94449000-2b17-4f57-847a-66662e074f9f',
        status: 'delivered'
      })

      const pendingNotifications = await getPendingNotifications()

      expect(pendingNotifications).toHaveLength(1)
      expect(pendingNotifications[0].message.id).toEqual('dc1028c8-bdda-48b8-b7c8-49c72b7fd383')
      expect(pendingNotifications[0].statusDetails.status).toEqual('created')
    })

    test('should return empty array if no pending notifications', async () => {
      await addNotificationRequest({
        ...v1,
        id: '94449000-2b17-4f57-847a-66662e074f9f'
      })

      await updateNotificationStatus({
        ...v1,
        id: '94449000-2b17-4f57-847a-66662e074f9f'
      }, {
        notificationId: '94449000-2b17-4f57-847a-66662e074f9f',
        status: 'delivered'
      })

      const pendingNotifications = await getPendingNotifications()

      expect(pendingNotifications).toHaveLength(0)
    })

    test('should throw error if connection fails', async () => {
      await dbClient.client.close()

      await expect(getPendingNotifications())
        .rejects
        .toMatchObject({
          message: 'Error fetching pending notifications',
          name: 'MongoNotConnectedError'
        })
    })
  })

  describe('get original notification request', () => {
    beforeEach(async () => {
      if (!dbClient.client.topology?.isConnected()) {
        await dbClient.client.connect()
      }

      await clearCollection('notificationRequests')
    })

    test('should return date of original notification request creation', async () => {
      const id = 'dc1028c8-bdda-48b8-b7c8-49c72b7fd383'

      await addNotificationRequest({
        ...v1,
        id
      })

      await addNotificationRequest({
        ...v1,
        id: '1563596c-a62d-4a7e-b797-04f8c3522a3b',
        timestamp: new Date().toISOString(),
        data: {
          ...v1.data,
          correlationId: id
        }
      })

      const request = await getOriginalNotificationRequest('source-system', id)

      expect(request.id).toEqual(id)
    })

    test('should return null if no original notification request found', async () => {
      const request = await getOriginalNotificationRequest('source-system', 'non-existing-id')

      expect(request).toBeNull()
    })

    test('should throw error if connection fails', async () => {
      await dbClient.client.close()

      await expect(getOriginalNotificationRequest('source-system', 'non-existing-id'))
        .rejects
        .toMatchObject({
          message: 'Error finding original notification for correlation id non-existing-id',
          name: 'MongoNotConnectedError'
        })
    })
  })

  describe('idempotency check', () => {
    beforeEach(async () => {
      if (!dbClient.client.topology?.isConnected()) {
        await dbClient.client.connect()
      }

      await clearCollection('notificationRequests')
    })

    test('should return true if notification request already exists', async () => {
      await addNotificationRequest(v1)

      const idempotencyCheck = await checkNotificationIdempotency(v1)

      expect(idempotencyCheck).toBe(true)
    })

    test.each([
      ['source-system', '583a2f5b-edb4-4580-bcdb-fb3b312ec4c8'],
      ['another-source-system', '79389915-7275-457a-b8ca-8bf206b2e67b']
    ])('should return false if source/id %s-%s combination does not exist', async (source, id) => {
      const mockMessage = {
        ...v1,
        source,
        id
      }

      const idempotencyCheck = await checkNotificationIdempotency(mockMessage)

      expect(idempotencyCheck).toBe(false)
    })

    test('should throw error if connection fails', async () => {
      const mockMessage = {
        ...v1,
        id: '583a2f5b-edb4-4580-bcdb-fb3b312ec4c8'
      }

      await dbClient.client.close()

      await expect(checkNotificationIdempotency(mockMessage))
        .rejects
        .toMatchObject({
          message: `Error checking idempotency token ${mockMessage.source}-${mockMessage.id}`,
          name: 'MongoNotConnectedError'
        })
    })
  })

  describe('notification updates', () => {
    beforeEach(async () => {
      if (!dbClient.client.topology?.isConnected()) {
        await dbClient.client.connect()
      }

      await clearCollection('notificationRequests')
    })

    test('should update notification status', async () => {
      const mockMessage = {
        ...v1,
        id: '15df79e7-806e-4c85-9372-a2e256a1d597',
        data: {
          ...v1.data,
          recipient: 'test@example.com'
        }
      }

      await addNotificationRequest(mockMessage)

      await updateNotificationStatus(mockMessage, {
        notificationId: 'e0cc0e3e-a54c-4372-a8fe-9436111d933e',
        status: 'delivered'
      })

      const notificationRequests = await getAllEntities('notificationRequests', {
        'message.id': mockMessage.id
      })

      expect(notificationRequests).toHaveLength(1)
      expect(notificationRequests[0].message).toEqual(mockMessage)
      expect(notificationRequests[0].statusDetails.status).toBe('delivered')
    })

    test('update should include error object if provided', async () => {
      const mockMessage = {
        ...v1,
        id: '1096a0cb-5ccd-41ff-973e-36ec0e69d1ed',
        data: {
          ...v1.data,
          recipient: 'test@example.com'
        }
      }

      const mockError = {
        status: 400,
        data: {
          error: {
            status_code: 400,
            errors: [
              {
                error: 'mock-error'
              }
            ]
          }
        }
      }

      await addNotificationRequest(mockMessage)

      await updateNotificationStatus(mockMessage, {
        notificationId: '1096a0cb-5ccd-41ff-973e-36ec0e69d1ed',
        status: 'internal-failure',
        error: mockError.data
      })

      const notificationRequests = await getAllEntities('notificationRequests', {
        'message.id': mockMessage.id
      })

      expect(notificationRequests).toHaveLength(1)
      expect(notificationRequests[0].message).toEqual(mockMessage)
      expect(notificationRequests[0].statusDetails.status).toBe('internal-failure')
      expect(notificationRequests[0].statusDetails.error).toEqual(mockError.data)
    })

    test.each([
      ['notificationId'],
      ['status'],
      ['error']
    ])('should not delete fields if not provided in update', async (field) => {
      const mockMessage = {
        ...v1,
        id: '1096a0cb-5ccd-41ff-973e-36ec0e69d1ed',
        data: {
          ...v1.data,
          recipient: 'test@example.com'
        }
      }

      const mockError = {
        status: 400,
        data: {
          error: {
            status_code: 400,
            errors: [
              {
                error: 'mock-error'
              }
            ]
          }
        }
      }

      const notificationId = 'e0cc0e3e-a54c-4372-a8fe-9436111d933e'

      await addNotificationRequest(mockMessage)

      await updateNotificationStatus(mockMessage, {
        notificationId,
        status: 'sending',
        error: mockError.data
      })

      const update = {
        notificationId,
        status: 'internal-failure',
        error: {
          status: 400,
          data: {
            error: {
              status_code: 400,
              errors: [
                {
                  error: 'mock-error'
                }
              ]
            }
          }
        }
      }

      delete update[field]

      await updateNotificationStatus(mockMessage, update)

      const notificationRequests = await getAllEntities('notificationRequests', {
        'message.id': mockMessage.id
      })

      expect(notificationRequests).toHaveLength(1)
      expect(notificationRequests[0].statusDetails[field]).toBeTruthy()
    })

    test('should throw error if connection fails', async () => {
      const mockMessage = {
        ...v1,
        id: '79a1d125-c8eb-40ec-8b97-ae5c8eb9bcbb',
        data: {
          ...v1.data,
          recipient: 'test@example.com'
        }
      }

      await dbClient.client.close()

      await expect(updateNotificationStatus(mockMessage, 'test@example.com', {
        notificationId: '79a1d125-c8eb-40ec-8b97-ae5c8eb9bcbb',
        status: 'delivered'
      })).rejects.toMatchObject({
        message: `Error updating notification status for ${mockMessage.source}-${mockMessage.id}`,
        name: 'MongoNotConnectedError'
      })
    })
  })

  afterAll(async () => {
    await clearCollection('notificationRequests')
  })
}, 60000)
