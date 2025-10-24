import notifyClient from '../../notify/notify-client.js'

const getNotifyResponse = async (id) => {
  try {
    const { data } = await notifyClient.getNotificationById(id)

    return {
      status: data.status,
      content: {
        subject: data.subject,
        body: data.body
      }
    }
  } catch (error) {
    const errors = error.response?.data?.errors

    if (!errors) {
      throw new Error(`Error getting status from GOV Notify for ${id}: ${error.message}`)
    }

    const errorMessage = errors.map((err) => err.message).join(', ')

    const statusCode = error.response?.status

    throw new Error(`Error getting status from GOV Notify for ${id}. Status code: ${statusCode}, Message: ${errorMessage}`)
  }
}

export { getNotifyResponse }
