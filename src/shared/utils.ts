import type {
  ProcedureBuilder,
  ProcedureParams,
  RootConfig,
} from "@trpc/server";
import type superjson from "superjson";
import { z, type ZodSchema } from "zod";
import { InferTRPCProcedureContext } from "../server/types";
import type { ChannelType, ChannelWithMember, ResponseFrom } from "./types";
export const channels = [
  "public",
  "private",
  "encrypted",
  "presence",
  "cache",
] as const;
export const channelsWithMember = [
  "private",
  "presence",
  "encrypted",
  "cache",
] as const;
export const channelsWithNoMember = ["public"];

export function isChannelType(type: string): type is ChannelType {
  return channels.includes(type as ChannelType);
}
export function isChannelWithMember(
  channel: ChannelType
): channel is ChannelWithMember {
  return channelsWithMember.includes(channel as any);
}

export function DataProcedure<
  TProcedure extends ProcedureBuilder<any>,
  TInput extends ZodSchema
>(
  procedure: ProcedureBuilder<
    ProcedureParams<
      RootConfig<{
        ctx: any;
        meta: any;
        errorShape: any;
        transformer: typeof superjson;
      }>,
      InferTRPCProcedureContext<TProcedure>,
      any,
      any
    >
  >,
  input: TInput
) {
  return procedure.input(input);
}

export const authHandlerBodySchema = z.object({
  channel_name: z.string(),
  socket_id: z.string(),
});

export const parseUserJson = (json: Record<string, any>) => {
  let res = {} as Record<string, any>;
  for (const key in json) {
    if (typeof json[key] === "object") {
      res[key] = parseUserJson(json[key]);
    } else {
      res[key] = isNaN(+json[key])
        ? json[key] !== "null" && json[key] !== "undefined"
          ? json[key] !== "false" && json[key] !== "true"
            ? json[key]
            : json[key] === "true"
          : null
        : +json[key];
    }
  }
  return res;
};

export const CHANNEL_SEPARATOR = "-";
export function setChannelName(
  channel_type?: string,
  channel_name?: string | number | symbol,
  id?: string
) {
  return [channel_type, channel_name, id]
    .filter((x) => x)
    .join(CHANNEL_SEPARATOR);
}

export function getChannelName(channel_name: string) {
  const string = z.string();
  const split = channel_name.split(CHANNEL_SEPARATOR);

  if (split.length === 1) {
    return string.parse(split[0]);
  }
  if (split.length >= 3) {
    return string.parse(split[1]);
  }

  if (channels.includes(split[0] as any)) {
    return string.parse(split[1]);
  } else {
    return string.parse(split[0]);
  }
}

export function getChannelType(channel_name: string): ChannelType | undefined {
  const string = z.string();
  const split = channel_name.split(CHANNEL_SEPARATOR);

  if (split.length === 1) {
    return "public";
  }
  if (split.length >= 3) {
    return string.parse(split[0]) as ChannelType;
  }

  if (channels.includes(split[0] as any)) {
    return string.parse(split[0]) as ChannelType;
  } else {
    return undefined;
  }
}

export function getChannelId(channel_name: string) {
  const string = z.string();
  const split = channel_name.split(CHANNEL_SEPARATOR);

  if (split.length === 1) {
    return undefined;
  }
  if (split.length >= 3) {
    return string.parse(split[2]);
  }

  if (channels.includes(split[0] as any)) {
    return undefined;
  } else {
    return string.parse(split[1]);
  }
}

export function parseChannelName(channel_name: string) {
  return {
    type: getChannelType(channel_name),
    name: getChannelName(channel_name),
    id: getChannelId(channel_name),
  };
}

export const DEFAULT_API_ENDPOINT = "/api/prpc/";

export const reproduceTRPCMutate = async (queryKeys: () => any, input: any) => {
  const apiUrl =
    "/api/trpc/" +
    [queryKeys(), input.prpc.channel_event].join(".").replace(",", ".") +
    "?batch=1";

  // @TODO - Find how use superjson
  return fetch(apiUrl, {
    method: "POST",
    body: `{"0":{"json":${JSON.stringify(input)}}}`,
  });
};

export class PRPCResponse<T> {
  result?: T | undefined;
  from: ResponseFrom | null = null;
  error?: {
    code: string;
    httpStatus: number;
    path: string;
    stack: string;
  };
  constructor(response: any[], internal_from?: ResponseFrom) {
    if (response?.[0]?.result?.data?.json) {
      this.result = response[0].result.data.json.result;
      this.from = response[0].result.data.json.from;
    } else if (internal_from && response?.[0]?.error) {
      this.from = internal_from;
      this.error = response[0].error.json.data;
    }
  }
}

export const querySchema = z.object({
  prpc: z.enum(["auth", "webhook"]),
});

export const webhookSchema = z.object({
  time_ms: z.number(),
  events: z.array(
    z.object({
      name: z.string(),
      channel: z.string(),
    })
  ),
});
