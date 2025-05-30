import { UnprocessableMessageError } from '../../errors/message-errors.js'

const parseSqsMessage = (message) => {
  try {
    const body = JSON.parse(message.Body)

    if (body.Type === 'Notification' && body.TopicArn) {
      return JSON.parse(body.Message)
    }

    return body
  } catch (error) {
    throw new UnprocessableMessageError('Invalid message', {
      cause: error
    })
  }
}

export { parseSqsMessage }
