import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import v3 from '../../../mocks/comms-request/v3.js'

import dbClient from '../../../../src/db/db-client.js'

import { clearCollection, getAllEntities } from '../../../helpers/mongo.js'
import { addNotificationRequest, checkNotificationIdempotency, getOriginalNotificationRequest, updateNotificationStatus } from '../../../../src/repos/notification-log.js'

describe('mongo notification request repository', () => {
  beforeEach(async () => {
    if (!dbClient.client.topology?.isConnected()) {
      await dbClient.client.connect()
    }

    await clearCollection('notificationRequests')
  })

  test('should log a notification request', async () => {
    const mockMessage = {
      ...v3,
      id: '94449000-2b17-4f57-847a-66662e074f9f'
    }

    await addNotificationRequest(mockMessage)

    const notificationRequests = await getAllEntities('notificationRequests', {
      'message.id': mockMessage.id
    })

    expect(notificationRequests).toHaveLength(1)
    expect(notificationRequests[0].message).toEqual(mockMessage)
  })

  test('should return date of original notification request creation', async () => {
    await addNotificationRequest({
      ...v3,
      id: 'dc1028c8-bdda-48b8-b7c8-49c72b7fd383'
    })

    await addNotificationRequest({
      ...v3,
      id: '1563596c-a62d-4a7e-b797-04f8c3522a3b',
      timestamp: new Date().toISOString(),
      data: {
        ...v3.data,
        correlationId: 'dc1028c8-bdda-48b8-b7c8-49c72b7fd383'
      }
    })

    const request = await getOriginalNotificationRequest('dc1028c8-bdda-48b8-b7c8-49c72b7fd383')

    expect(request.id).toEqual('dc1028c8-bdda-48b8-b7c8-49c72b7fd383')
  })

  describe('idempotency check', () => {
    beforeEach(async () => {
      if (!dbClient.client.topology?.isConnected()) {
        await dbClient.client.connect()
      }

      await clearCollection('notificationRequests')
    })

    test('should return true if notification request already exists', async () => {
      await addNotificationRequest(v3)

      const idempotencyCheck = await checkNotificationIdempotency(v3)

      expect(idempotencyCheck).toBe(true)
    })

    test.each([
      ['source-system', '583a2f5b-edb4-4580-bcdb-fb3b312ec4c8'],
      ['another-source-system', '79389915-7275-457a-b8ca-8bf206b2e67b']
    ])('should return false if source/id %s-%s combination does not exist', async (source, id) => {
      const message = {
        ...v3,
        source,
        id
      }

      const idempotencyCheck = await checkNotificationIdempotency(message)

      expect(idempotencyCheck).toBe(false)
    })

    test('should throw error if connection fails', async () => {
      await dbClient.client.close()

      await expect(checkNotificationIdempotency(v3))
        .rejects
        .toThrow()
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
        ...v3,
        id: '15df79e7-806e-4c85-9372-a2e256a1d597',
        data: {
          ...v3.data,
          commsAddresses: 'test@example.com'
        }
      }

      await addNotificationRequest(mockMessage)

      await updateNotificationStatus(mockMessage, 'test@example.com', 'delivered')

      const notificationRequests = await getAllEntities('notificationRequests', {
        'message.id': mockMessage.id
      })

      expect(notificationRequests).toHaveLength(1)
      expect(notificationRequests[0].message).toEqual(mockMessage)
      expect(notificationRequests[0].recipients[0].status).toBe('delivered')
    })

    test('update should include error object if provided', async () => {
      const mockMessage = {
        ...v3,
        id: '1096a0cb-5ccd-41ff-973e-36ec0e69d1ed',
        data: {
          ...v3.data,
          commsAddresses: 'test@example.com'
        }
      }

      const mockError = {
        response: {
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

      await addNotificationRequest(mockMessage)

      await updateNotificationStatus(mockMessage, 'test@example.com', 'internal-failure', mockError)

      const notificationRequests = await getAllEntities('notificationRequests', {
        'message.id': mockMessage.id
      })

      expect(notificationRequests).toHaveLength(1)
      expect(notificationRequests[0].message).toEqual(mockMessage)
      expect(notificationRequests[0].recipients[0].status).toBe('internal-failure')
      expect(notificationRequests[0].recipients[0].error).toEqual(mockError)
    })

    test('should throw error if connection fails', async () => {
      const mockMessage = {
        ...v3,
        id: '79a1d125-c8eb-40ec-8b97-ae5c8eb9bcbb',
        data: {
          ...v3.data,
          commsAddresses: 'test@example.com'
        }
      }

      await dbClient.client.close()

      await expect(updateNotificationStatus(mockMessage, 'test@example.com', 'delivered'))
        .rejects
        .toMatchObject({
          message: 'Error updating notification status for message id: 79a1d125-c8eb-40ec-8b97-ae5c8eb9bcbb',
          cause: expect.any(Error)
        })
    })
  })

  afterAll(async () => {
    await clearCollection('notificationRequests')
  })
}, 60000)
