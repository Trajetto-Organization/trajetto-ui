import { defineField, defineType } from "sanity";

export default defineType({
  name: "legalPolicy",
  title: "Política Legal",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Título da Política",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Descrição",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "content",
      title: "Conteúdo",
      type: "array",
      of: [
        {
          type: "block",
        },
      ],
    }),
    // SEO Fields
    defineField({
      name: "metaTitle",
      title: "Meta Título (SEO)",
      type: "string",
      description:
        "Título otimizado para SEO (se diferente do título principal)",
    }),
    defineField({
      name: "metaDescription",
      title: "Meta Descrição (SEO)",
      type: "text",
      rows: 2,
      description: "Descrição otimizada para SEO",
    }),
    defineField({
      name: "robots",
      title: "Robots (SEO)",
      type: "string",
      options: {
        list: [
          { title: "Index, Follow", value: "index, follow" },
          { title: "No Index, No Follow", value: "noindex, nofollow" },
          { title: "Index, No Follow", value: "index, nofollow" },
          { title: "No Index, Follow", value: "noindex, follow" },
        ],
      },
      initialValue: "index, follow",
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
    },
  },
});
