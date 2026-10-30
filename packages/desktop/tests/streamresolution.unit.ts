import { strict as assert } from 'node:assert'
import MessageChannel from 'xbox-xcloud-player/dist/Channel/Message'
import ControlChannel from 'xbox-xcloud-player/dist/Channel/Control'
import { configureStreamResolution } from '../renderer/lib/streamresolution'
import xCloudApi from '../main/helpers/xcloudapi'

describe('Desktop stream resolution', () => {
    for (const type of ['home', 'cloud'] as const) {
        it(`advertises the correct session dimensions for ${type}`, async () => {
            const api = new xCloudApi({ _store: { get: () => 'en-US' } } as any, 'stream.example', '', type)
            let request: any
            api.post = async (url, body, headers) => {
                request = { url, body, headers }
                return {}
            }
            await api.startStream('console-or-title')
            const device = JSON.parse(request.headers['X-MS-Device-Info'])
            assert.deepEqual(device.dev.displayInfo.dimensions, {
                widthInPixels: 2560,
                heightInPixels: 1440,
            })
            assert.equal(request.url, `/v5/sessions/${type}/play`)
        })

        it(`sends the correct initial handshake dimensions for ${type}`, () => {
            const messages: any[] = []
            const controls: any[] = []
            const client = {
                _config: {},
                _inputDriver: { start() {} },
                _keyboardDriver: { start() {} },
                getChannelProcessor: name => name === 'control' ? control : { start() {} },
                getEventBus: () => ({ emit() {} }),
            }
            const control = new ControlChannel('control', client as any)
            control.send = data => controls.push(JSON.parse(data))
            const channel = new MessageChannel('message', client as any)
            channel.send = data => messages.push(JSON.parse(data))
            configureStreamResolution({ getChannelProcessor: name => name === 'message' ? channel : control } as any)
            channel.onMessage({ data: JSON.stringify({ type: 'HandshakeAck' }) })
            const dimensions = messages.find(message => message.target === '/streaming/characteristics/dimensionschanged')
            const width = 2560
            const height = 1440
            assert.deepEqual(JSON.parse(dimensions.content), {
                horizontal: width, vertical: height,
                preferredWidth: width, preferredHeight: height,
                safeAreaLeft: 0, safeAreaTop: 0, safeAreaRight: width, safeAreaBottom: height,
                supportsCustomResolution: true,
            })
            assert.equal(messages.length, 6)
            assert.equal(controls[0].message, 'authorizationRequest')
            assert.deepEqual(controls.filter(message => message.message === 'userRequestedResolutionUpdate'),
                [{ message: 'userRequestedResolutionUpdate', resolutionAlias: '1440' }])
        })
    }
})
