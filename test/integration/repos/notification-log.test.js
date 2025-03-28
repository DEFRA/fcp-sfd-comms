import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals'

import v3 from '../../mocks/comms-request/v3.js'

import { clearCollection, getAllEntities } from '../../helpers/mongo.js'
import { addNotificationRequest, checkNotificationIdempotency, updateNotificationStatus } from '../../../src/repos/notification-log.js'

jest.setTimeout(30000)

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

  afterAll(async () => {
    await clearCollection('notificationRequests')
  })
})
