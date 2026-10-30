import { z } from 'zod'

export const xCloudStreamConfig = z.object({
    id: z.string(),
    type: z.enum(['home', 'cloud']),
    language: z.string(),
    host: z.string(),
    resolution: z.union([z.literal(720), z.literal(1080), z.literal(1440)]),
})
