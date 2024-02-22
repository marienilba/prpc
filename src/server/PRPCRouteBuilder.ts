import { ProcedureBuilder } from "@trpc/server";
import { z, type ZodObject } from "zod";
import { ChannelType } from "../shared/types";
import { isChannelWithMember } from "../shared/utils";
import { PRPCRoute, PRPCRouteAuthHandler } from "./types";

export class PRPCRouteBuilder<
  TRoute extends PRPCRoute,
  TType extends ChannelType = any,
  TUser extends ZodObject<any> = any,
  TContext extends (opts: any) => Promise<any> = any
> {
  public _defs: {
    route: TRoute;
    type: TType;
    user: TUser;
    procedure: TRoute["procedure"];
    auth_handler: PRPCRouteAuthHandler<TUser, TType, TContext>;
  };

  private channel_type: TType;
  private procedure: TRoute["procedure"];
  constructor(route: PRPCRoute, channel_type: ChannelType) {
    // @ts-ignore
    this._defs = {
      type: channel_type as any,
      user: (route as any)?.user,
    };

    this.channel_type = channel_type as any;
    this.procedure = this.configProcedure<TRoute["procedure"]>(
      route.procedure,
      (route as any)?.user
    );

    this._defs.procedure = this.procedure;
  }

  auth<T extends PRPCRouteAuthHandler<TUser, TType, TContext>>(handler: T) {
    this._defs.auth_handler = handler;
    return this;
  }

  private configProcedure<TProcedure extends ProcedureBuilder<any>>(
    procedure: TProcedure,
    user?: ZodObject<any>
  ) {
    const schema =
      isChannelWithMember(this.channel_type) && user
        ? z.object({
            prpc: z.object({
              channel_type: z.string().optional(),
              channel_id: z.string().optional(),
              channel_name: z.string().optional(),
              channel_event: z.string(),
              socket_id: z.string().optional(),
              members: z.object({}).catchall(user),
              me: z.object({
                id: z.string(),
                info: user,
              }),
            }),
          })
        : z.object({
            prpc: z.object({
              channel_type: z.string().optional(),
              channel_id: z.string().optional(),
              channel_name: z.string().optional(),
              channel_event: z.string(),
              socket_id: z.string().optional(),
            }),
          });

    return procedure.input(schema);
  }
}
