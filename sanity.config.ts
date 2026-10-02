import { defineConfig } from "sanity";
import { visionTool } from "@sanity/vision";
import { product } from "./sanity/schemas/product";
import { structureTool } from "sanity/structure";
import { deskStructure } from "./sanity/desk-structure";

export default defineConfig({
  name: "obest-catalogue",
  title: "O-BEST Catalogue",
  projectId: "ese1smjb",
  dataset: "production",
  plugins: [
    structureTool({ structure: deskStructure }),
    visionTool(),
  ],
  schema: {
    types: [product],
  },
});
