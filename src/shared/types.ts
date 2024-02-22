import { PRPCRouterProcedures } from "../server/types";
import { channels, channelsWithMember, channelsWithNoMember } from "./utils";

export type ChannelType = (typeof channels)[number];
export type ChannelWithMember = (typeof channelsWithMember)[number];
export type ChannelWithNoMember = (typeof channelsWithNoMember)[number];

export type Exact<A, B> = A extends B ? (B extends A ? A : never) : never;
export type AnyPRPCRouter = PRPCRouterProcedures<any, any>;

export type PusherEvent =
  | "pusher:subscription_succeeded"
  | "pusher:subscription_error"
  | "pusher:cache_miss"
  | "pusher:subscription_count"
  | "pusher:error"
  | "pusher:member_added"
  | "pusher:member_removed"
  | "pusher:connection_established"
  | "pusher:connection_failed"
  | "pusher:member_updated"
  | "pusher:presence_diff"
  | "pusher:client-event";

export type Channel<T extends ChannelType = any> = {
  id?: string;
  channel: string;
  type: T extends ChannelType ? T : string;
};

export type ResponseFrom = {
  channel?: {
    id?: string;
    channel?: string;
    type?: string;
  };
  socket_id?: string;
  user: {
    id: string;
    info: any;
  };
};
