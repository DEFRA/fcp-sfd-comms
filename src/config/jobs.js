export const jobsConfig = {
  jobs: {
    checkNotifyStatus: {
      cronPattern: {
        doc: 'Cron expression for checking notify status.',
        format: String,
        default: '*/30 * * * * *',
        env: 'CHECK_NOTIFY_STATUS_CRON_PATTERN'
      }
    }
  }
}
