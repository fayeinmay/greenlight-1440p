import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { xCloudStreamConfig } from './types/streamconfig.js';

import pkg from '../package.json';

import authController from './controller/auth.js';
import profileController from './controller/profile.js';
import smartglassController from './controller/smartglass.js';
import gamepassController from './controller/gamepass.js';

import {
  startStream,
  getStreamStatus,
  sendSDPOffer,
  sendICECandidates,
  sendMsalToken,
  sendKeepalive
 } from '@greenlight/player/server'

const t = initTRPC.create();
export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

const auth = new authController();
const profile = new profileController();
const smartglass = new smartglassController();
const gamepass = new gamepassController();

const zodWebToken = z.object({
  uhs: z.string(),
  token: z.string(),
})

const zodXhomeToken = z.object({
  token: z.string(),
  market: z.string(),
  language: z.string(),
})

const zodUserToken = z.object({
  token_type: z.string(),
  scope: z.string(),
  expires_in: z.number(),
  ext_expires_in: z.number(),
  access_token: z.string(),
  refresh_token: z.string(),
  id_token: z.string(),
})

export const appRouter = router({
    ping: publicProcedure.query(() => 'pong'),
    version: publicProcedure.query(() => pkg.version),
    echo: publicProcedure.input(z.string()).query(({ input }) => `echo: ${input}`),

    auth_msal_start: publicProcedure.query(async () => await auth.startMsalAuth()),
    auth_msal_verify: publicProcedure.input(z.string()).query(async ({ input }) => await auth.verifyDeviceCode(input)),
    auth_msal_refresh: publicProcedure.input(zodUserToken).query(async ({ input }) => await auth.refreshUserToken(input)),
    auth_get_streamingtokens: publicProcedure.input(zodUserToken).query(async ({ input }) => await auth.getStreamingTokens(input)),
    auth_get_webtoken: publicProcedure.input(zodUserToken).query(async ({ input }) => await auth.getWebToken(input)),

    profile_get_current: publicProcedure.input(zodWebToken).query(async ({ input }) => await profile.getCurrentProfile(input)),
    profile_get_friends: publicProcedure.input(zodWebToken).query(async ({ input }) => await profile.getFriendsList(input)),
    
    smartglass_consoles_list: publicProcedure.input(zodWebToken).query(async ({ input }) => await smartglass.getConsolesList(input)),

    gamepass_get_titles: publicProcedure.input(zodXhomeToken).query(async ({ input }) => await gamepass.getTitles(input)),
    gamepass_get_recent_titles: publicProcedure.input(zodXhomeToken).query(async ({ input }) => await gamepass.getRecentTitles(input)),
    gamepass_get_new_titles: publicProcedure.input(zodXhomeToken).query(async ({ input }) => await gamepass.getNewTitles(input)),

    gamepass_batch_productids: publicProcedure.input(z.object({ token: zodXhomeToken, productIds: z.array(z.string()) })).query(async ({ input }) => await gamepass.resolveTitles(input.token, input.productIds)),
    gamepass_resolve_productid: publicProcedure.input(z.object({ token: zodXhomeToken, productId: z.string() })).query(async ({ input }) => await gamepass.resolveTitle(input.token, input.productId)),

    streaming_start_stream: publicProcedure.input(z.object({ token: zodXhomeToken, xCloudStreamConfig: xCloudStreamConfig })).mutation(async ({ input }) => await startStream(input.token, input.xCloudStreamConfig)),
    streaming_get_status: publicProcedure.input(z.object({ token: zodXhomeToken, xCloudStreamConfig: xCloudStreamConfig, sessionPath: z.string() })).mutation(async ({ input }) => await getStreamStatus(input.token, input.xCloudStreamConfig, input.sessionPath)),
    streaming_send_sdp_offer: publicProcedure.input(z.object({ token: zodXhomeToken, xCloudStreamConfig: xCloudStreamConfig, sessionPath: z.string(), sdpOffer: z.any() })).mutation(async ({ input }) => await sendSDPOffer(input.token, input.xCloudStreamConfig, input.sessionPath, input.sdpOffer)),
    streaming_send_ice_candidates: publicProcedure.input(z.object({ token: zodXhomeToken, xCloudStreamConfig: xCloudStreamConfig, sessionPath: z.string(), candidates: z.array(z.any()) })).mutation(async ({ input }) => await sendICECandidates(input.token, input.xCloudStreamConfig, input.sessionPath, input.candidates)),
    streaming_send_msal_token: publicProcedure.input(z.object({ token: zodXhomeToken, xCloudStreamConfig: xCloudStreamConfig, sessionPath: z.string(), refreshToken: z.string() })).mutation(async ({ input }) => await sendMsalToken(input.token, input.xCloudStreamConfig, input.sessionPath, input.refreshToken)),
    streaming_send_keepalive: publicProcedure.input(z.object({ token: zodXhomeToken, xCloudStreamConfig: xCloudStreamConfig, sessionPath: z.string() })).mutation(async ({ input }) => await sendKeepalive(input.token, input.xCloudStreamConfig, input.sessionPath)),
});

export default appRouter;
