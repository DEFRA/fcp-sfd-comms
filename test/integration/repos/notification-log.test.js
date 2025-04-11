import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals'

import v3 from '../../mocks/comms-request/v3.js'

import { clearCollection, getAllEntities } from '../../helpers/mongo.js'
import { addNotificationRequest, checkNotificationIdempotency, getOriginalNotificationRequest, updateNotificationStatus } from '../../../src/repos/notification-log.js'

jest.setTimeout(60000)

describe('mongo notification request repository', () => {
  beforeAll(async () => {
    await clearCollection('notificationRequests')
    await addNotificationRequest(v3)
  })

  test('should log a notification request', async () => {
    const mockMessage = {
      ...v3,
      id: '0ee3e3c4-a41a-4ff7-9f75-9a5645d3d6f4'
    }

    await addNotificationRequest(mockMessage)

    const notificationRequests = await getAllEntities('notificationRequests', {
      'message.id': mockMessage.id
    })

    expect(notificationRequests).toHaveLength(1)
    expect(notificationRequests[0].message).toEqual(mockMessage)
  })

  describe('idempotency check', () => {
    test('should return true if notification request already exists', async () => {
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
  })

  test('should update notification status', async () => {
    await updateNotificationStatus(v3, 'test@example.com', 'delivered')

    const notificationRequests = await getAllEntities('notificationRequests', {
      'message.id': v3.id
    })

    expect(notificationRequests).toHaveLength(1)
    expect(notificationRequests[0].message).toEqual(v3)
    expect(notificationRequests[0].recipients[0].status).toBe('delivered')
  })

  test('update should include error object if provided', async () => {
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

    await updateNotificationStatus(v3, 'test@example.com', 'internal-failure', mockError)

    const notificationRequests = await getAllEntities('notificationRequests', {
      'message.id': v3.id
    })

    expect(notificationRequests).toHaveLength(1)
    expect(notificationRequests[0].message).toEqual(v3)
    expect(notificationRequests[0].recipients[0].status).toBe('internal-failure')
    expect(notificationRequests[0].recipients[0].error).toEqual(mockError)
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

  afterAll(async () => {
    await clearCollection('notificationRequests')
  })
})
