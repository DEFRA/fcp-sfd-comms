export const mongoConfig = {
  mongo: {
    mongoUri: {
      doc: 'URI for mongodb',
      format: String,
      default: 'mongodb://127.0.0.1:27017/',
      env: 'MONGO_URI'
    },
    database: {
      doc: 'database for mongodb',
      format: String,
      default: 'fcp-sfd-comms',
      env: 'MONGO_DATABASE'
    }
  }
}
