import { strict as assert } from 'node:assert'
import { xCloudStreamConfig } from '../src/types/streamconfig'

describe('Stream config validation', () => {
    const common = { id: 'console-or-title', host: 'https://stream.example', language: 'en-US' }

    it('accepts 1440p for both local Remote Play and xCloud', () => {
        assert.equal(xCloudStreamConfig.safeParse({ ...common, type: 'home', resolution: 1440 }).success, true)
        assert.equal(xCloudStreamConfig.safeParse({ ...common, type: 'cloud', resolution: 1440 }).success, true)
    })

    it('preserves existing 720p and 1080p configs for both services', () => {
        for (const type of ['home', 'cloud']) {
            for (const resolution of [720, 1080]) {
                assert.equal(xCloudStreamConfig.safeParse({ ...common, type, resolution }).success, true)
            }
            assert.equal(xCloudStreamConfig.safeParse({ ...common, type, resolution: 2160 }).success, false)
        }
    })
})
