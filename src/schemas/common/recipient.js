import Joi from 'joi'

import { config } from '../../config/index.js'

const createComponent = () => {
  if (config.get('notify.allowSimulatorEmails')) {
    return Joi.alternatives().try(
      Joi.string().email(),
      Joi.string().valid('temp-fail@simulator.notify', 'perm-fail@simulator.notify')
    )
  }

  return Joi.string().email()
}

const recipient = createComponent()

export default recipient
