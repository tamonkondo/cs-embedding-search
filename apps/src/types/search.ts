import { z } from "zod";

export const SourceTypeEnum = z.enum(["ticket", "help", "manual"]);
export type SourceType = z.infer<typeof SourceTypeEnum>;

export const ProductEnum = z.enum(["Starter", "Pro", "Enterprise"]);
export type Product = z.infer<typeof ProductEnum>;

export const ChannelEnum = z.enum(["email", "chat", "phone"]);
export type Channel = z.infer<typeof ChannelEnum>;

export const SearchModeEnum = z.enum(["full", "vec"]);
export type SearchMode = z.infer<typeof SearchModeEnum>;

export const SearchDocSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  source_type: SourceTypeEnum,
  product: ProductEnum,
  channel: ChannelEnum,
  updated_at: z.string(), // ISO string
});
export type SearchDoc = z.infer<typeof SearchDocSchema>;

// Reusable option lists derived from enums
export const PRODUCTS = ProductEnum.options;
export const CHANNELS = ChannelEnum.options;
