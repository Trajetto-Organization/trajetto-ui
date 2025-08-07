import { defineField, defineType } from "sanity";

export default defineType({
  name: "blogPost",
  title: "Blog Post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      validation: (Rule) => Rule.required().max(100),
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
      name: "excerpt",
      title: "Resumo/Excerpt",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: "content",
      title: "Conteúdo",
      type: "array",
      of: [
        {
          type: "block",
        },
        {
          type: "image",
          options: { hotspot: true },
        },
      ],
    }),
    defineField({
      name: "featuredImage",
      title: "Imagem Destacada",
      type: "image",
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "author",
      title: "Autor",
      type: "reference",
      to: [{ type: "author" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Categoria",
      type: "reference",
      to: [{ type: "category" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
    }),
    defineField({
      name: "readTime",
      title: "Tempo de Leitura",
      type: "number",
      description: "Tempo estimado de leitura em minutos",
    }),
    defineField({
      name: "publishedAt",
      title: "Data de Publicação",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "featured",
      title: "Post em Destaque",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        defineField({
          name: "metaTitle",
          title: "Meta Título",
          type: "string",
          validation: (Rule) =>
            Rule.max(60).warning("Recomendado até 60 caracteres"),
        }),
        defineField({
          name: "metaDescription",
          title: "Meta Descrição",
          type: "text",
          rows: 3,
          validation: (Rule) =>
            Rule.max(160).warning("Recomendado até 160 caracteres"),
        }),
        defineField({
          name: "focusKeyword",
          title: "Palavra-chave Principal",
          type: "string",
        }),
        defineField({
          name: "keywords",
          title: "Palavras-chave Secundárias",
          type: "array",
          of: [{ type: "string" }],
        }),
        defineField({
          name: "canonicalUrl",
          title: "URL Canônica",
          type: "url",
        }),
        defineField({
          name: "robots",
          title: "Robots",
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
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "featuredImage",
    },
    prepare(selection) {
      const { author } = selection;
      return { ...selection, subtitle: author && `by ${author}` };
    },
  },
  orderings: [
    {
      title: "Data de Publicação, Mais Recente",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
});

const authorSchema = defineType({
  name: "author",
  title: "Autor",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Nome",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "avatar",
      title: "Avatar",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "socialLinks",
      title: "Redes Sociais",
      type: "object",
      fields: [
        defineField({
          name: "twitter",
          title: "Twitter/X",
          type: "url",
        }),
        defineField({
          name: "linkedin",
          title: "LinkedIn",
          type: "url",
        }),
        defineField({
          name: "instagram",
          title: "Instagram",
          type: "url",
        }),
      ],
    }),
  ],
});

const categorySchema = defineType({
  name: "category",
  title: "Categoria",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Título",
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
    }),
    defineField({
      name: "description",
      title: "Descrição",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "color",
      title: "Cor",
      type: "string",
      options: {
        list: [
          { title: "Roxo", value: "#7c3aed" },
          { title: "Azul", value: "#3b82f6" },
          { title: "Verde", value: "#10b981" },
          { title: "Laranja", value: "#f97316" },
          { title: "Rosa", value: "#ec4899" },
        ],
      },
      initialValue: "#7c3aed",
    }),
  ],
});

export { authorSchema, categorySchema };
