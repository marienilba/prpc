import type {
  AnyRootConfig,
  AnyRouter,
  ProcedureBuilder,
  ProcedureParams,
} from "@trpc/server";
import type { NextApiRequest, NextApiResponse } from "next";
import type Pusher from "pusher";
import { z, type ZodObject, type ZodSchema } from "zod";
import { Channel, ChannelType, ChannelWithMember } from "../shared/types";
import { PRPCPusher } from "./PRPCPusher";
import { PRPCRouteBuilder } from "./PRPCRouteBuilder";
import { PRPCPresenceRouteTRPC, PRPCPublicRouteTRPC } from "./PRPCRouteTRPC";

export type BuilderCreateParameters = {
  pusher: Pusher;
  transformer: any;
  context: (opts: any) => Promise<any>;
};

export type PRPCProxy<TRouter extends AnyRouter> = {
  [P in keyof TRouter as TRouter[P] extends AnyRouter ? P : never]?: P;
};

export type PRPCRouter = {
  [key: string]: PRPCRouteBuilder<any, any, any, any>;
};

export type PRPCRoute = PRPCRoutePublic | PRPCRoutePresence;

export type PRPCRoutePublic = {
  procedure: ProcedureBuilder<any>;
};

export type PRPCRoutePresence = PRPCRoutePublic & {
  user: ZodObject<any>;
};

export type PRPCRouteAuthHandler<
  TData extends ZodObject<any>,
  TType extends ChannelType,
  TContext extends (opts: any) => Promise<any>
> = TType extends ChannelWithMember
  ? (args: {
      req: NextApiRequest;
      res: NextApiResponse<any>;
      data: {
        socket_id: string;
        channel: {
          type: ChannelType | undefined;
          name: string;
          id: string | undefined;
        };
      } & Partial<z.infer<TData>>;
      ctx: TContext extends (opts: any) => Promise<infer R> ? R : any;
    }) => Promise<z.infer<TData>>
  : never;

export type PRPCRouterProcedures<
  TRouter extends PRPCRouter,
  TTransformer = any
> = {
  [P in keyof TRouter]: TRouter[P] extends PRPCRouteBuilder<any, any>
    ? TRouter[P]["_defs"]["procedure"] extends ProcedureBuilder<any>
      ? TRouter[P]["_defs"]["type"] extends ChannelWithMember
        ? Omit<
            PRPCPresenceRouteTRPC<
              TRouter[P]["_defs"]["procedure"],
              TRouter[P]["_defs"]["user"],
              TTransformer
            >,
            "_defs"
          >
        : Omit<
            PRPCPublicRouteTRPC<TRouter[P]["_defs"]["procedure"], TTransformer>,
            "_defs"
          >
      : never
    : never;
};

type PRPCRouterContext<TRouter extends PRPCRouterProcedures<any, any>> =
  TRouter extends PRPCRouterProcedures<infer TBuilder, any>
    ? {
        [P in keyof TBuilder]: TBuilder[P] extends PRPCRouteBuilder<any, any>
          ? TBuilder[P]["_defs"]["procedure"] extends ProcedureBuilder<any>
            ? InferTRPCProcedureContext<TBuilder[P]["_defs"]["procedure"]>
            : never
          : never;
      }[keyof TBuilder]
    : never;

export type PRPCPusherContext<
  TPresence extends boolean,
  TMe extends ZodObject<any> | ZodSchema
> = Omit<PRPCPusher<TPresence, z.infer<TMe>>, "setInput">;

export type PRPCContext<
  T extends ProcedureBuilder<any>,
  TPresence extends boolean,
  TMe extends ZodObject<any> | ZodSchema
> = InferTRPCProcedureContext<T> & {
  pusher: PRPCPusherContext<TPresence, z.infer<TMe>>;
};

export type InferTRPCProcedureContext<T extends ProcedureBuilder<any>> =
  T extends ProcedureBuilder<infer Params>
    ? Params extends ProcedureParams<
        AnyRootConfig,
        any,
        any,
        any,
        any,
        any,
        any
      >
      ? Params extends ProcedureParams<
          AnyRootConfig,
          infer Context,
          any,
          any,
          any,
          any,
          any
        >
        ? Context
        : never
      : never
    : never;

export type InferTRPCProcedureInput<T extends ProcedureBuilder<any>> =
  T extends ProcedureBuilder<infer Params>
    ? Params extends ProcedureParams<
        AnyRootConfig,
        any,
        any,
        any,
        any,
        any,
        any
      >
      ? Params extends ProcedureParams<
          AnyRootConfig,
          any,
          infer Input,
          any,
          any,
          any,
          any
        >
        ? Input
        : never
      : never
    : never;

export type InferTRPCProcedureOutput<T extends ProcedureBuilder<any>> =
  T extends ProcedureBuilder<infer Params>
    ? Params extends ProcedureParams<
        AnyRootConfig,
        any,
        any,
        any,
        any,
        any,
        any
      >
      ? Params extends ProcedureParams<
          AnyRootConfig,
          any,
          any,
          infer Ouput,
          any,
          any,
          any
        >
        ? Ouput
        : never
      : never
    : never;
export type InferTRPCProcedureParams<T extends ProcedureBuilder<any>> =
  T extends ProcedureBuilder<infer Params> ? Params : never;

export type PRPCInternalRouter = {
  [key: string]:
    | PRPCPublicRouteTRPC<any, any>
    | PRPCPresenceRouteTRPC<any, ZodObject<any>, any>;
} & {
  _defs: {
    pusher: Pusher;
    ctx: (opts: any) => Promise<any>;
  };
};
export type NextApiHandler = <
  PRPCRouter extends PRPCRouterProcedures<any, any>
>(args: {
  router: PRPCRouter;
  webhooks?: NextApiWebhookHandler<PRPCRouter>;
  onError?: (error: { message: string; channel_name: string }) => void;
}) => void;

export type NextApiWebhookHandler<
  PRPCRouter extends PRPCRouterProcedures<any, any> = PRPCRouterProcedures<
    any,
    any
  >
> = {
  existence?: (
    data: {
      name: "channel_occupied" | "channel_vacated";
      channel: Channel;
    },
    ctx: PRPCRouterContext<PRPCRouter> & { pusher: Pusher }
  ) => void | Promise<void>;
  presence?: (
    data: {
      name: "member_added" | "member_removed";
      channel: Channel<"presence">;
      user_id: string;
    },
    ctx: PRPCRouterContext<PRPCRouter> & { pusher: Pusher }
  ) => void | Promise<void>;
  events?: (
    data: {
      name: string;
      channel: Channel;
      user_id: string;
      data: unknown;
      socket_id: string;
    },
    ctx: PRPCRouterContext<PRPCRouter> & { pusher: Pusher }
  ) => void | Promise<void>;
  cache?: (
    data: { name: "cache_miss"; channel: Channel<"cache"> },
    ctx: PRPCRouterContext<PRPCRouter> & { pusher: Pusher }
  ) => void | Promise<void>;
};
