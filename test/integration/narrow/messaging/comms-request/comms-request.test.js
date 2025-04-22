import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

import v3 from '../../../../mocks/comms-request/v3.js'

import { getQueueSize, resetQueue, sendMessage } from '../../../../helpers/sqs.js'

import { getCommsProcessor } from '../../../../../src/messaging/inbound/comms-request/processors/processor.js'
import { startMessaging, stopMessaging } from '../../../../../src/messaging/inbound/inbound.js'

vi.mock('../../../../../src/messaging/inbound/comms-request/processors/processor.js')

const commsRequestQueueUrl = process.env.COMMS_REQUEST_QUEUE_URL
const commsRequestDlqUrl = process.env.COMMS_REQUEST_DEAD_LETTER_QUEUE_URL

describe('comms request consumer integration', () => {
  beforeAll(() => {
    startMessaging()
  })

  beforeEach(async () => {
    vi.clearAllMocks()

    await resetQueue(commsRequestQueueUrl)
    await resetQueue(commsRequestDlqUrl)
  })

  test('should complete comms message placed on SQS', async () => {
    await sendMessage(
      commsRequestQueueUrl,
      JSON.stringify(v3)
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 3000)
    })

    const size = await getQueueSize(
      commsRequestQueueUrl
    )

    expect(size.available).toBe(0)
  })

  test('should complete comms message on processor error', async () => {
    getCommsProcessor.mockImplementation(() => {
      const processor = async () => {
        throw new Error('Processor error')
      }

      return processor
    })

    await sendMessage(
      commsRequestQueueUrl,
      JSON.stringify(v3)
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 3000)
    })

    const size = await getQueueSize(
      commsRequestQueueUrl
    )

    expect(size.available).toBe(0)
  })

  afterAll(async () => {
    stopMessaging()
  })
}, 60000)
