import { v1 } from '../src/schemas/comms-request/index.js'
import { validate } from '../src/schemas/validate.js'
import mock from '../test/mocks/comms-request/v1.js'

const run = async () => {
    const base = {
        ...mock,
        data: { ...mock.data }
    }

    for (const val of ['', null]) {
        base.data.correlationId = val
        const [value, error] = await validate(v1, base)
        console.log('correlationId:', val, '->', error ? 'INVALID' : 'VALID')
    }
}

run().catch(err => { console.error(err); process.exit(1) })
