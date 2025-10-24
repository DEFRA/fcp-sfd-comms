import notifyClient from '../../notify/notify-client.js'

const getNotifyStatus = async (id) => {
  try {
    const { data } = await notifyClient.getNotificationById(id)

    return data.status
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

export { getNotifyStatus }
