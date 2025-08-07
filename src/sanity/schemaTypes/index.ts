import { type SchemaTypeDefinition } from "sanity";

import legalType from "./legalType";
import blogPost, { authorSchema, categorySchema } from "./blogPost";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [legalType, blogPost, authorSchema, categorySchema],
};
