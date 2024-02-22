import type { NextApiRequest, NextApiResponse } from "next";
import { type ZodObject } from "zod";
import {
  authHandlerBodySchema,
  getChannelName,
  isChannelWithMember,
  parseChannelName,
  parseUserJson,
  querySchema,
  webhookSchema,
} from "../shared/utils";
import { PRPCBuilder } from "./PRPCBuilder";
import { PRPCPresenceRouteTRPC } from "./PRPCRouteTRPC";
import type {
  NextApiHandler,
  NextApiWebhookHandler,
  PRPCInternalRouter,
  PRPCRouterProcedures,
} from "./types";

export const initPRPC = {
  context: function () {
    return new PRPCBuilder();
  },
};

export const createNextApiHandler: NextApiHandler = ({
  router: r,
  webhooks,
  onError,
}) => {
  const router = r as any as PRPCInternalRouter;
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { prpc } = querySchema.parse(req.query);

    switch (prpc) {
      case "auth":
        const { socket_id, channel_name, ...body } = req.body;

        const pusherAuthCtx = authHandlerBodySchema.parse({
          socket_id: socket_id,
          channel_name: channel_name,
        });

        const prpc_route = getChannelName(pusherAuthCtx.channel_name);
        if (!router[prpc_route]) {
          onError &&
            onError({
              message: "Route not found in PRPC router",
              channel_name: pusherAuthCtx.channel_name,
            });
          return;
        }

        if (isChannelWithMember(router[prpc_route]!._defs.builder._defs.type)) {
          const route = router[prpc_route] as PRPCPresenceRouteTRPC<
            any,
            ZodObject<any>,
            any
          >;

          const user = parseUserJson(body);

          try {
            const ctx = await router._defs.ctx({ req: req, res: res });
            const data = await route._defs.builder._defs.auth_handler({
              req: req,
              res: res,
              data: {
                ...user,
                socket_id: pusherAuthCtx.socket_id,
                channel: parseChannelName(pusherAuthCtx.channel_name),
              },
              ctx: ctx,
            });

            const authResponse = router._defs.pusher.authorizeChannel(
              pusherAuthCtx.socket_id,
              pusherAuthCtx.channel_name,
              {
                user_id: String(Math.random() * 1000),
                user_info: data,
              }
            );
            res.send(authResponse);
          } catch (error: any) {
            onError &&
              onError({
                message: "Error with the auth function",
                channel_name: pusherAuthCtx.channel_name,
              });
          }
        } else {
          res.send(null);
        }
        return;

      case "webhook":
        if (!webhooks) {
          res.status(401).end();
          return;
        }
        const webhook = router._defs.pusher.webhook({
          headers: req.headers as any,
          rawBody: JSON.stringify(req.body),
        });

        if (!webhook.isValid()) {
          onError &&
            onError({
              message: "The webhook headers are not valid",
              channel_name: "",
            });
          res.status(402).end();
          return;
        }

        try {
          const ctx = await router._defs.ctx({ req: req, res: res });
          const body = webhook.getData();
          const data = webhookSchema.passthrough().parse(body);

          for (const event of data.events) {
            const channel = parseChannelName(event.channel);

            if (
              (event.name === "channel_occupied" ||
                event.name === "channel_vacated") &&
              webhooks.existence
            ) {
              await webhooks.existence({ ...event, channel: channel } as any, {
                ...ctx,
                pusher: router._defs.pusher,
              });
              continue;
            }

            if (
              (event.name === "member_added" ||
                event.name === "member_removed") &&
              webhooks.presence
            ) {
              await webhooks.presence({ ...event, channel: channel } as any, {
                ...ctx,
                pusher: router._defs.pusher,
              });
              continue;
            }

            if (event.name === "cache_miss" && webhooks.cache) {
              await webhooks.cache({ ...event, channel: channel } as any, {
                ...ctx,
                pusher: router._defs.pusher,
              });

              continue;
            }

            if (webhooks.events) {
              await webhooks.events({ ...event, channel: channel } as any, {
                ...ctx,
                pusher: router._defs.pusher,
              });
            }
          }

          res.status(200).end();
        } catch (error) {
          onError &&
            onError({
              message: "Error with webhook",
              channel_name: "",
            });
          res.status(403).end();
        }

        return;
      default:
        res.status(405).end();
        break;
    }
  };
};

export const createNextWehbookApiHandler = <
  PRPCRouter extends PRPCRouterProcedures<any, any>
>(
  config: NextApiWebhookHandler<PRPCRouter>
) => {
  return config;
};
