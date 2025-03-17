import { MongoClient } from 'mongodb'

const mongoClient = await MongoClient.connect(process.env.MONGO_URI)

const dbClient = mongoClient.db('fcp-sfd-comms')

const getAllEntities = async (collection, query) => {
  const entities = await dbClient.collection(collection)
    .find(query)
    .toArray()

  return entities
}

const clearCollection = async (collection) => {
  await dbClient.collection(collection).deleteMany({})
}

export {
  getAllEntities,
  clearCollection
}
