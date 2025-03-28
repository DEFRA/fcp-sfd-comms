export const notifyConfig = {
  notify: {
    apiKey: {
      doc: 'API key for GOV.UK Notify.',
      format: String,
      default: null,
      env: 'NOTIFY_API_KEY'
    },
    statusCheckMaxAttempts: {
      doc: 'Maximum number of attempts to check Notify request status.',
      format: Number,
      default: 10,
      env: 'STATUS_CHECK_MAX_ATTEMPTS'
    },
    statusCheckInterval: {
      doc: 'Interval in milliseconds between Notify request status checks.',
      format: Number,
      default: 5000,
      env: 'STATUS_CHECK_INTERVAL'
    }
  }
}
