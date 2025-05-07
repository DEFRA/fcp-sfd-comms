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
    },
    retries: {
      temporaryFailureTimeout: {
        doc: 'Timeout in hours for temporary failure retries.',
        format: 'int',
        default: 168,
        env: 'NOTIFY_TEMPORARY_FAILURE_TIMEOUT'
      },
      retryDelay: {
        doc: 'Delay to schedule messages for retry in minutes.',
        format: 'int',
        default: 15,
        env: 'MESSAGE_RETRY_DELAY'
      }
    },
    allowSimulatorEmails: {
      doc: 'Allow use of GOV Notify simulator emails.',
      format: Boolean,
      default: process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development',
      env: 'ALLOW_SIMULATOR_EMAILS'
    }
  }
}
