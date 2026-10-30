import type xCloudPlayer from 'xbox-xcloud-player'

// xbox-xcloud-player 0.2.x has no resolution setting and hardcodes 1080p.
// Apply this after bind(), before the message-channel handshake.
export function configureStreamResolution(player: xCloudPlayer) {
    const control = player.getChannelProcessor('control')
    const start = control.start.bind(control)
    control.start = () => {
        start()
        control.send(JSON.stringify({
            message: 'userRequestedResolutionUpdate',
            resolutionAlias: '1440',
        }))
    }

    const channel = player.getChannelProcessor('message')
    const generateMessage = channel.generateMessage.bind(channel)
    channel.generateMessage = (path: string, data: Record<string, unknown>) => generateMessage(path,
        path === '/streaming/characteristics/dimensionschanged' ? {
            ...data,
            horizontal: 2560,
            vertical: 1440,
            preferredWidth: 2560,
            preferredHeight: 1440,
            safeAreaRight: 2560,
            safeAreaBottom: 1440,
        } : data)
}
