import { strict as assert } from 'node:assert'
import { startStream } from '../src/server/index'
import MessageChannel from '../src/client/lib/channel/message'
import ControlChannel from '../src/client/lib/channel/control'
import Player from '../src/client/lib/player'
import type { xCloudStreamConfig } from '../src/types/index'

const token = { token: '', language: 'en-US', market: 'US' }
const common = { id: 'console-or-title', host: 'https://stream.example', language: 'en-US' }
const cases: Array<{ config: xCloudStreamConfig; width: number; height: number; os: string }> = [
    { config: { ...common, type: 'home', resolution: 1440 }, width: 2560, height: 1440, os: 'windows' },
    { config: { ...common, type: 'home', resolution: 1080 }, width: 1920, height: 1080, os: 'windows' },
    { config: { ...common, type: 'home', resolution: 720 }, width: 1920, height: 1080, os: 'android' },
    { config: { ...common, type: 'cloud', resolution: 1440 }, width: 2560, height: 1440, os: 'windows' },
    { config: { ...common, type: 'cloud', resolution: 1080 }, width: 1920, height: 1080, os: 'windows' },
    { config: { ...common, type: 'cloud', resolution: 720 }, width: 1920, height: 1080, os: 'android' },
]

describe('Stream resolution negotiation', () => {
    for (const { config, width, height, os } of cases) {
        it(`advertises the correct device for ${config.type} ${config.resolution}p`, async () => {
            const originalFetch = globalThis.fetch
            let request: { url: string; options: RequestInit } | undefined
            globalThis.fetch = async (url, options) => {
                request = { url: String(url), options: options! }
                return new Response(JSON.stringify({ sessionPath: 'session' }))
            }
            try {
                await startStream(token, config)
                assert.equal(request!.url, `${config.host}/v5/sessions/${config.type}/play`)
                const headers = request!.options.headers as Record<string, string>
                const device = JSON.parse(headers['X-MS-Device-Info'])
                assert.deepEqual(device.dev.displayInfo.dimensions, { widthInPixels: width, heightInPixels: height })
                assert.equal(device.dev.os.name, os)
                const body = JSON.parse(request!.options.body as string)
                assert.equal(body.serverId, config.type === 'home' ? config.id : '')
                assert.equal(body.titleId, config.type === 'cloud' ? config.id : '')
            } finally {
                globalThis.fetch = originalFetch
            }
        })

        it(`sends matching dimensions and safe area for ${config.type} ${config.resolution}p`, () => {
            const messages: any[] = []
            const controls: any[] = []
            // Exercise the real message serialization without opening a browser connection.
            const player = Object.create(Player.prototype)
            player._streamConfig = config
            player._peerConnection = {
                createDataChannel: (label: string) => ({
                    readyState: 'open',
                    send: (data: Uint8Array) => (label === 'control' ? controls : messages).push(JSON.parse(new TextDecoder().decode(data))),
                }),
            }
            new MessageChannel(player).sendConfig()
            const message = messages.find(message => message.target === '/streaming/characteristics/dimensionschanged')
            assert.deepEqual(JSON.parse(message.content), {
                horizontal: width, vertical: height,
                preferredWidth: width, preferredHeight: height,
                safeAreaLeft: 0, safeAreaTop: 0, safeAreaRight: width, safeAreaBottom: height,
                supportsCustomResolution: true,
            })
            assert.equal(messages.length, 6)
            new ControlChannel(player).sendAuthorization()
            assert.equal(controls[0].message, 'authorizationRequest')
            assert.deepEqual(controls.filter(message => message.message === 'userRequestedResolutionUpdate'),
                config.resolution === 1440
                    ? [{ message: 'userRequestedResolutionUpdate', resolutionAlias: '1440' }]
                    : [])
        })
    }

    it('preserves 1080p for callers without a stream config', () => {
        const player = Object.create(Player.prototype)
        assert.deepEqual(player.getStreamDimensions(), { width: 1920, height: 1080 })
    })
})
