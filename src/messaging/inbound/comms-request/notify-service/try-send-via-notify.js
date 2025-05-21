import notifyClient from '../../../../notify/notify-client.js'

const trySendViaNotify = async (templateId, recipient, params = {}) => {
  try {
    const response = await notifyClient.sendEmail(
      templateId,
      recipient,
      params
    )

    return [response, null]
  } catch (error) {
    if (!error.response) {
      throw new Error(`Unknown error while attempting to send email via Notify: ${error.message || error.code}`)
    }

    return [null, error.response]
  }
}

export { trySendViaNotify }
