import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'

import mockV1CommsRequest from '../../../mocks/comms-request/v1.js'
import environments from '../../../../src/constants/environments.js'

import { v1 } from '../../../../src/schemas/comms-request/index.js'
import { validate } from '../../../../src/schemas/validate.js'

describe('comms request schema v1 validation', () => {
  let mockV1Message

  beforeEach(() => {
    mockV1Message = {
      ...mockV1CommsRequest,
      data: {
        ...mockV1CommsRequest.data
      }
    }
  })

  test('malformed object should return error', async () => {
    const data = '-----{}'

    const [, error] = await validate(v1, data)

    expect(error).toBeTruthy()
    expect(error.details).toContainEqual(expect.objectContaining({
      message: '"body" must be of type object'
    }))
  })

  test('valid object should return message', async () => {
    const [value, error] = await validate(v1, mockV1CommsRequest)

    expect(value).toBeTruthy()
    expect(error).toBeNull()
  })

  describe('required / optional fields', () => {
    beforeEach(() => {
      mockV1Message = {
        ...mockV1CommsRequest,
        data: {
          ...mockV1CommsRequest.data
        }
      }
    })

    test.each([
      ['id'],
      ['source'],
      ['specversion'],
      ['type'],
      ['datacontenttype'],
      ['time'],
      ['data']
    ])('missing CloudEvent %s should return error', async (field) => {
      delete mockV1Message[field]

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeNull()
      expect(error).toBeTruthy()
      expect(error.details).toContainEqual(expect.objectContaining({
        message: `"${field}" is required`
      }))
    })

    test.each([
      ['sbi'],
      ['notifyTemplateId'],
      ['commsType'],
      ['recipient'],
      ['personalisation'],
      ['reference'],
      ['emailReplyToId']
    ])('missing data %s should return error', async (field) => {
      delete mockV1Message.data[field]

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeNull()
      expect(error).toBeTruthy()
      expect(error.details).toContainEqual(expect.objectContaining({
        message: `"data.${field}" is required`
      }))
    })

    test.each([
      ['crn'],
      ['oneClickUnsubscribeUrl']
    ])('missing optional data %s should return message', async (field) => {
      mockV1Message.data = {
        ...mockV1CommsRequest.data,
        [field]: undefined
      }

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeTruthy()
      expect(error).toBeNull()
    })
  })

  describe('crn', () => {
    beforeEach(() => {
      mockV1Message.data.crn = '1234567890'
    })

    test.each([
      ['1050000000'],
      ['1092374890'],
      ['9999999999']
    ])('valid crn %s should return message', async (crn) => {
      mockV1Message.data.crn = crn

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeTruthy()
      expect(error).toBeNull()
    })

    test.each([
      ['1049999999', '"data.crn" must be greater than or equal to 1050000000'],
      ['10000000000', '"data.crn" must be less than or equal to 9999999999'],
      ['123456789a', '"data.crn" must be a number'],
      ['asdfghjkl', '"data.crn" must be a number']
    ])('invalid crn %s should return error', async (crn, expectedMessage) => {
      mockV1Message.data.crn = crn

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeNull()
      expect(error).toBeTruthy()
      expect(error.details).toContainEqual(expect.objectContaining({
        message: expectedMessage
      }))
    })
  })

  describe('sbi', () => {
    beforeEach(() => {
      mockV1Message.data.sbi = '1234567890'
    })

    test('missing sbi should return error', async () => {
      delete mockV1Message.data.sbi

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeNull()
      expect(error).toBeTruthy()
      expect(error.details).toContainEqual(expect.objectContaining({
        message: '"data.sbi" is required'
      }))
    })

    test.each([
      ['105000000'],
      ['109237489'],
      ['999999999']
    ])('valid sbi %s should return message', async (sbi) => {
      mockV1Message.data.sbi = sbi

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeTruthy()
      expect(error).toBeNull()
    })

    test.each([
      ['104999999', '"data.sbi" must be greater than or equal to 105000000'],
      ['1000000000', '"data.sbi" must be less than or equal to 999999999'],
      ['123456789a', '"data.sbi" must be a number'],
      ['asdfghjkl', '"data.sbi" must be a number']
    ])('invalid sbi %s should return error', async (sbi, expectedMessage) => {
      mockV1Message.data.sbi = sbi

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeNull()
      expect(error).toBeTruthy()
      expect(error.details).toContainEqual(expect.objectContaining({
        message: expectedMessage
      }))
    })
  })

  describe('sourceSystem', () => {
    beforeEach(() => {
      mockV1Message.data.sourceSystem = 'source'
    })

    test('missing sourceSystem should return error', async () => {
      delete mockV1Message.data.sourceSystem

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeNull()
      expect(error).toBeTruthy()
      expect(error.details).toContainEqual(expect.objectContaining({
        message: '"data.sourceSystem" is required'
      }))
    })

    test.each([
      ['source'],
      ['source-system'],
      ['source_system'],
      ['source-system-comms']
    ])('valid sourceSystem %s should return message', async (sourceSystem) => {
      mockV1Message.data.sourceSystem = sourceSystem

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeTruthy()
      expect(error).toBeNull()
    })

    test.each([
      ['source.system', '"data.sourceSystem" with value "source.system" fails to match the required pattern: /^[a-z0-9-_]+$/'],
      ['source$system', '"data.sourceSystem" with value "source$system" fails to match the required pattern: /^[a-z0-9-_]+$/'],
      ['sourceSystem', '"data.sourceSystem" with value "sourceSystem" fails to match the required pattern: /^[a-z0-9-_]+$/']
    ])('invalid sourceSystem %s should return error', async (sourceSystem, expectedMessage) => {
      mockV1Message.data.sourceSystem = sourceSystem

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeNull()
      expect(error).toBeTruthy()
      expect(error.details).toContainEqual(expect.objectContaining({
        message: expectedMessage
      }))
    })
  })

  describe('recipient', () => {
    test('missing recipient should return error', async () => {
      delete mockV1Message.data.recipient

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeNull()
      expect(error).toBeTruthy()
      expect(error.details).toContainEqual(expect.objectContaining({
        message: '"data.recipient" is required'
      }))
    })

    test('email array should return error', async () => {
      mockV1Message.data.recipient = ['test@example.com']

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeNull()
      expect(error).toBeTruthy()
    })

    test('valid email should return message', async () => {
      mockV1Message.data.recipient = 'test@example.com'

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeTruthy()
      expect(error).toBeNull()
    })

    test('invalid email should return error', async () => {
      mockV1Message.data.recipient = 'test@example'

      const [value, error] = await validate(v1, mockV1Message)

      expect(value).toBeNull()
      expect(error).toBeTruthy()
      expect(error.details).toContainEqual(expect.objectContaining({
        message: '"data.recipient" must be a valid email'
      }))
    })

    describe('notify simulator emails', () => {
      const originalEnv = process.env

      beforeEach(() => {
        vi.resetModules()
      })

      test.each([
        environments.DEVELOPMENT,
        environments.TEST
      ])('should allow temp fail simulator email in %s environment', async (env) => {
        process.env.NODE_ENV = env

        const { v1: mockedV1 } = await import('../../../../src/schemas/comms-request/index.js')

        const message = {
          ...mockV1Message,
          data: {
            ...mockV1Message.data,
            recipient: 'temp-fail@simulator.notify'
          }
        }

        const [value, error] = await validate(mockedV1, message)

        expect(value).toBeTruthy()
        expect(error).toBeNull()
      })

      test.each([
        environments.DEVELOPMENT,
        environments.TEST
      ])('should allow perm fail simulator email in %s environment', async (env) => {
        process.env.NODE_ENV = env

        const { v1: mockedV1 } = await import('../../../../src/schemas/comms-request/index.js')

        const message = {
          ...mockV1Message,
          data: {
            ...mockV1Message.data,
            recipient: 'perm-fail@simulator.notify'
          }
        }

        const [value, error] = await validate(mockedV1, message)

        expect(value).toBeTruthy()
        expect(error).toBeNull()
      })

      test('should not allow temp fail simulator email in production environment', async () => {
        process.env.NODE_ENV = environments.PRODUCTION

        const { v1: mockedV1 } = await import('../../../../src/schemas/comms-request/index.js')

        const message = {
          ...mockV1Message,
          data: {
            ...mockV1Message.data,
            recipient: 'temp-fail@simulator.notify'
          }
        }

        const [value, error] = await validate(mockedV1, message)

        expect(value).toBeNull()
        expect(error).toBeTruthy()
        expect(error.details).toContainEqual(expect.objectContaining({
          message: expect.stringContaining('must be a valid email')
        }))
      })

      test('should not allow perm fail simulator email in production environment', async () => {
        process.env.NODE_ENV = environments.PRODUCTION

        const { v1: mockedV1 } = await import('../../../../src/schemas/comms-request/index.js')

        const message = {
          ...mockV1Message,
          data: {
            ...mockV1Message.data,
            recipient: 'perm-fail@simulator.notify'
          }
        }

        const [value, error] = await validate(mockedV1, message)

        expect(value).toBeNull()
        expect(error).toBeTruthy()
        expect(error.details).toContainEqual(expect.objectContaining({
          message: expect.stringContaining('must be a valid email')
        }))
      })

      test.each([
        environments.DEVELOPMENT,
        environments.TEST,
        environments.PRODUCTION
      ])('should always allow real emails in %s environment', async (env) => {
        process.env.NODE_ENV = env

        const { v1: mockedV1 } = await import('../../../../src/schemas/comms-request/index.js')

        const message = {
          ...mockV1Message,
          data: {
            ...mockV1Message.data,
            recipient: 'test@example.com'
          }
        }

        const [value, error] = await validate(mockedV1, message)

        expect(value).toBeTruthy()
        expect(error).toBeNull()
      })

      test.each([
        environments.DEVELOPMENT,
        environments.TEST
      ])('should reject array of emails in %s environment with type error', async (env) => {
        process.env.NODE_ENV = env

        const { v1: mockedV1 } = await import('../../../../src/schemas/comms-request/index.js')

        const message = {
          ...mockV1Message,
          data: {
            ...mockV1Message.data,
            recipient: [
              'test@example.com'
            ]
          }
        }

        const [value, error] = await validate(mockedV1, message)

        expect(value).toBeNull()
        expect(error).toBeTruthy()
        expect(error.details).toContainEqual(expect.objectContaining({
          message: '"data.recipient" does not match any of the allowed types'
        }))
      })

      test('should reject array of emails in production environment with string error', async (env) => {
        process.env.NODE_ENV = environments.PRODUCTION

        const { v1: mockedV1 } = await import('../../../../src/schemas/comms-request/index.js')

        const message = {
          ...mockV1Message,
          data: {
            ...mockV1Message.data,
            recipient: [
              'test@example.com'
            ]
          }
        }

        const [value, error] = await validate(mockedV1, message)

        expect(value).toBeNull()
        expect(error).toBeTruthy()
        expect(error.details).toContainEqual(expect.objectContaining({
          message: '"data.recipient" must be a string'
        }))
      })

      afterAll(() => {
        process.env = originalEnv
      })
    })
  })
})
