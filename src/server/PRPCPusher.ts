import type Pusher from "pusher";
import { type ZodObject, type ZodSchema } from "zod";
import { ChannelType } from "../shared/types";
import { parseChannelName, setChannelName } from "../shared/utils";

export class PRPCPusher<
  TPresence extends boolean = any,
  TMe extends ZodObject<any> | ZodSchema = any
> {
  private pusher: Pusher;
  private channel_type: ChannelType | undefined;
  private channel_id: string | undefined;
  private channel_name: string | undefined;
  private channel_event: string | undefined;
  private socket_id: string | undefined;
  private me: { id: string; info: TMe } | undefined;
  constructor(pusher: Pusher, channel_name: string, channel_type: string) {
    this.pusher = pusher;
    this.channel_name = channel_name;
    this.channel_type = channel_type as ChannelType;
  }

  setInput(input: {
    channel_id: string | undefined;
    channel_event: string;
    socket_id?: string | undefined;
    me?: any;
  }) {
    this.channel_id = input.channel_id;
    this.channel_event = input.channel_event;
    this.socket_id = input?.socket_id;
    this.me = input?.me;
    return this;
  }

  async trigger<T>(data: T): Promise<T>;
  async trigger<T>(data: T, eventName: string): Promise<void>;
  async trigger<T>(data: T, eventName?: string): Promise<T | void> {
    const channel = setChannelName(
      this.channel_type,
      this.channel_name,
      this.channel_id
    );

    if (eventName) {
      await this.pusher.trigger(channel, eventName, data);
      return;
    }
    await this.pusher.trigger(channel, this.channel_event!, data);
    return {
      result: data,
      from: {
        channel: parseChannelName(channel),
        socket_id: this.socket_id,
        user: this.me,
      },
    } as any;
  }

  async terminate(userId: string): Promise<Pusher.Response>;
  async terminate(userIds: string[]): Promise<Map<string, Pusher.Response>>;
  async terminate(
    userIds: string | string[]
  ): Promise<Pusher.Response | Map<string, Pusher.Response>> {
    if (Array.isArray(userIds)) {
      const map = new Map<string, Pusher.Response>();
      for await (const userId of userIds) {
        map.set(userId, await this.pusher.terminateUserConnections(userId));
      }
      return map;
    } else {
      return await this.pusher.terminateUserConnections(userIds);
    }
  }

  async send<T>(userId: string, data: T): Promise<T>;
  async send<T>(userIds: string[], data: T): Promise<T>;
  async send<T>(userIds: string | string[], data: T): Promise<T> {
    if (Array.isArray(userIds)) {
      for await (const userId of userIds) {
        await this.pusher.sendToUser(userId, this.channel_event!, data);
      }
    } else {
      await this.pusher.sendToUser(userIds, this.channel_event!, data);
    }
    return {
      result: data,
      from: {
        socket_id: this.socket_id,
        user: this.me,
      },
    } as any;
  }

  async members(): Promise<{ id: string }[]> {
    const channel = setChannelName(
      this.channel_type,
      this.channel_name,
      this.channel_id
    );

    const members = await this.pusher.get({
      path: `/channels/${channel}/users`,
    });
    return await members.json();
  }
}
