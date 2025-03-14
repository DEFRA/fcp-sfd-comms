import Joi from 'joi'

import environments from '../../constants/environments.js'

import { config } from '../../config/index.js'

const nonProductionEnvironments = [
  environments.DEVELOPMENT,
  environments.TEST
]

const createComponent = () => {
  if (nonProductionEnvironments.includes(config.get('env'))) {
    return Joi.alternatives().try(
      Joi.string().email(),
      Joi.string().valid('temp-fail@simulator.notify', 'perm-fail@simulator.notify')
    )
  }

  return Joi.string().email()
}

const recipient = createComponent()

export default recipient
