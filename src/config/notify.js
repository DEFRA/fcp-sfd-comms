export const notifyConfig = {
  notify: {
    apiKey: {
      doc: 'API key for GOV.UK Notify.',
      format: String,
      default: null,
      env: 'NOTIFY_API_KEY'
    },
    statusCheckTimeout: {
      doc: 'Timeout interval (milliseconds) for checking Notify request status.',
      format: Number,
      default: 60000,
      env: 'STATUS_CHECK_TIMEOUT'
    }
  }
}
