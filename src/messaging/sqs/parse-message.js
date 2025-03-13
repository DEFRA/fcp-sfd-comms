import { UnprocessableMessageError } from '../../errors/message-errors.js'

const parseSqsMessage = (message) => {
  try {
    const body = JSON.parse(message.Body)

    return body
  } catch (err) {
    throw new UnprocessableMessageError('Invalid message', {
      cause: err
    })
  }
}

export { parseSqsMessage }
