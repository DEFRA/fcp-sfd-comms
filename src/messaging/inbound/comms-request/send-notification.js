import { notifyClient } from '../../../clients/notify.js'

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

const sendNotification = async (message) => {
  const emailAddresses = Array.isArray(message.data.commsAddresses)
    ? message.data.commsAddresses
    : [message.data.commsAddresses]

  for (const emailAddress of emailAddresses) {
    await trySendViaNotify(message, emailAddress)
  }
}

export { sendNotification }
