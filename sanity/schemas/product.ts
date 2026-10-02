import { defineField, defineType } from "sanity";

const categories = [
  { title: "Power & charging", value: "power" },
  { title: "Audio", value: "audio" },
  { title: "Computing", value: "computing" },
  { title: "Wearables", value: "wearables" },
  { title: "Home & appliances", value: "home" },
  { title: "Phone parts", value: "parts" },
];

const itemTypes = [
  { title: "Power banks", value: "power-banks" },
  { title: "Chargers", value: "chargers" },
  { title: "Cables", value: "cables" },
  { title: "Earbuds", value: "earbuds" },
  { title: "Headphones", value: "headphones" },
  { title: "Mice", value: "mice" },
  { title: "Smartwatches", value: "smartwatches" },
  { title: "Fans", value: "fans" },
  { title: "Cookers", value: "cookers" },
  { title: "Vacuum cleaners", value: "vacuum-cleaners" },
  { title: "Phone screens", value: "phone-screens" },
  { title: "Power/volume flexes", value: "power-flex" },
];

const itemTypesByCategory = {
  power: ["power-banks", "chargers", "cables"],
  audio: ["earbuds", "headphones"],
  computing: ["mice"],
  wearables: ["smartwatches"],
  home: ["fans", "cookers", "vacuum-cleaners"],
  parts: ["phone-screens", "power-flex"],
};

const availabilityOptions = [
  { title: "Ask us to check", value: "check" },
  { title: "Available (confirm with shop)", value: "available" },
  { title: "Unavailable", value: "unavailable" },
];

const iconOptions = [
  "bank", "cable", "charger", "cooker", "earbuds", "fan", "flex",
  "headphones", "mouse", "screenpart", "vacuum", "watch",
].map((value) => ({ title: value.replaceAll("-", " "), value }));

const lineRequired = (Rule) => Rule.required().min(1).max(160);

export const product = defineType({
  name: "product",
  title: "Product",
  type: "document",
  orderings: [
    {
      title: "Product name",
      name: "nameAsc",
      by: [{ field: "name", direction: "asc" }],
    },
    {
      title: "Category, then product name",
      name: "categoryNameAsc",
      by: [
        { field: "category", direction: "asc" },
        { field: "name", direction: "asc" },
      ],
    },
  ],
  fields: [
    defineField({
      name: "name",
      title: "Product name",
      type: "string",
      validation: lineRequired,
    }),
    defineField({
      name: "slug",
      title: "URL ID",
      type: "slug",
      description: "Used in the product URL. Keep this unique and do not change it after publishing unless needed.",
      options: {
        source: "name",
        maxLength: 96,
        slugify: (input) => input
          .normalize("NFKD")
          .toLowerCase()
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 96),
      },
      validation: (Rule) => Rule.required().custom((value) => {
        if (!value?.current) return true;
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current)
          ? true
          : "Use lowercase letters, numbers and hyphens for the product URL ID.";
      }),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      description: "Power & charging; Audio; Computing; Wearables; Home & appliances; or Phone parts.",
      options: { list: categories, layout: "dropdown" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "itemType",
      title: "Product type",
      type: "string",
      description: "Choose a type that belongs to the selected category: Power & charging (power banks, chargers, cables); Audio (earbuds, headphones); Computing (mice); Wearables (smartwatches); Home & appliances (fans, cookers, vacuum cleaners); Phone parts (phone screens, power/volume flexes).",
      options: { list: itemTypes, layout: "dropdown" },
      validation: (Rule) => Rule.required().custom((value, context) => {
        const category = context.parent?.category;
        if (!category || !value) return true;
        return itemTypesByCategory[category]?.includes(value)
          ? true
          : "Choose a product type that belongs to the selected category.";
      }),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required().min(1).max(600),
    }),
    defineField({
      name: "availability",
      title: "Availability label",
      type: "string",
      initialValue: "check",
      options: { list: availabilityOptions, layout: "radio" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Product photo",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alternative text",
          type: "string",
          validation: (Rule) => Rule.max(240),
        }),
      ],
    }),
    defineField({ name: "brand", title: "Brand", type: "string", validation: (Rule) => Rule.max(100) }),
    defineField({ name: "model", title: "Model", type: "string", validation: (Rule) => Rule.max(160) }),
    defineField({ name: "capacity", title: "Capacity", type: "string", validation: (Rule) => Rule.max(100) }),
    defineField({ name: "output", title: "Output", type: "string", validation: (Rule) => Rule.max(160) }),
    defineField({ name: "details", title: "Additional details", type: "text", rows: 2, validation: (Rule) => Rule.max(500) }),
    defineField({
      name: "source",
      title: "Specification/source link",
      type: "url",
      validation: (Rule) => Rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "photoSource",
      title: "Supplier photo source link",
      type: "url",
      description: "Shown to customers as a supplier reference; it does not confirm shop stock or compatibility.",
      validation: (Rule) => Rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "icon",
      title: "Catalogue illustration",
      type: "string",
      initialValue: "case",
      options: { list: [{ title: "Default accessory", value: "case" }, ...iconOptions], layout: "dropdown" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "legacyBatch",
      title: "Original catalogue batch (migration reference)",
      type: "number",
      readOnly: true,
      hidden: true,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "availability",
      media: "image",
    },
  },
});

export { availabilityOptions, categories, itemTypes };
