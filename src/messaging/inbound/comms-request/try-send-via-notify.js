import notifyClient from '../../../notify/notify-client.js'

const trySendViaNotify = async (message, emailAddress) => {
  try {
    const response = notifyClient.sendEmail(
      message.data.notifyTemplateId,
      emailAddress, {
        personalisation: message.data.personalisation,
        reference: message.correlationId ?? message.id
      }
    )

    return [response, null]
  } catch (error) {
    console.error('Failed to send email via GOV Notify. Error:', error)

    return [null, error]
  }
}

export { trySendViaNotify }
