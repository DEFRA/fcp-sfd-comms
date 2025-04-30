import notifyClient from '../../notify/notify-client.js'

const getNotifyStatus = async (id) => {
  const { data } = await notifyClient.getNotificationById(id)

  return data.status
}

export { getNotifyStatus }
