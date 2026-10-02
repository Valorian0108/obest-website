const groupedCategories = [
  { id: "power", title: "Power & charging" },
  { id: "audio", title: "Audio" },
  { id: "computing", title: "Computing" },
  { id: "wearables", title: "Wearables" },
  { id: "home", title: "Home & appliances" },
  { id: "parts", title: "Phone parts" },
];

export const deskStructure = (S, context) =>
  S.list()
    .title("O-BEST catalogue")
    .items([
      S.documentTypeListItem("product").title("All products"),
      S.listItem()
        .title("Products by category")
        .child(
          S.list()
            .title("Product categories")
            .items(
              groupedCategories.map(({ id, title }) =>
                S.listItem()
                  .id(`products-${id}`)
                  .title(title)
                  .child(
                    S.documentList()
                      .id(`product-list-${id}`)
                      .title(title)
                      .schemaType("product")
                      .filter('_type == "product" && category == $category')
                      .params({ category: id })
                      .defaultOrdering([{ field: "name", direction: "asc" }]),
                  ),
              ),
            ),
        ),
    ]);
