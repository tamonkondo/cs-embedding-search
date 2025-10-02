declare module "pg" {
  export type QueryResult<R = unknown> = {
    rows: R[];
    rowCount: number;
    command: string;
    oid: number;
    fields: unknown[];
  };

  export class Pool {
    constructor(config?: unknown);
    query<R = unknown>(
      text: string,
      params?: unknown[],
    ): Promise<QueryResult<R>>;
    connect(): Promise<unknown>;
    end(): Promise<void>;
  }
}
