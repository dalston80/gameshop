# Gaming features: store setup

The theme's gaming features read a few product metafields and the platform tags on your products. Nothing here runs automatically: you choose how to set it up.

## 1. Platform tags (My Platform and platform badges)

Add a tag to each product for every platform it works on. Defaults are `playstation`, `xbox`, `nintendo` and `pc`. A controller that works on PlayStation and PC gets both tags. Names, tags and colors are editable in **Theme settings > Platforms**.

## 2. Metafield definitions

### Option A: in the Shopify admin
**Settings > Custom data > Products > Add definition**, three times:

| Name | Namespace and key | Type |
|---|---|---|
| Release date | `custom.release_date` | Date |
| Other editions and platforms | `custom.other_editions` | Product, list of products |
| Setup items (optional) | `custom.setup_items` | Product, list of products |

### Option B: with Shopify CLI
This uses Shopify CLI against your store. It authenticates in your browser and then creates the three definitions. It changes only metafield definitions, nothing else.

```bash
shopify store auth --store <your-store>.myshopify.com --scopes write_products

shopify store execute --store <your-store>.myshopify.com --allow-mutations --query '
mutation CreateGamingMetafieldDefinitions {
  releaseDate: metafieldDefinitionCreate(definition: {
    name: "Release date", namespace: "custom", key: "release_date",
    description: "Date the product is released. Drives Pre-order and New release labels.",
    type: "date", ownerType: PRODUCT
  }) { createdDefinition { id key } userErrors { field message code } }
  otherEditions: metafieldDefinitionCreate(definition: {
    name: "Other editions and platforms", namespace: "custom", key: "other_editions",
    description: "Other editions or platform versions of this product.",
    type: "list.product_reference", ownerType: PRODUCT
  }) { createdDefinition { id key } userErrors { field message code } }
  setupItems: metafieldDefinitionCreate(definition: {
    name: "Setup items", namespace: "custom", key: "setup_items",
    description: "Optional. Products shown in Complete your setup. Overrides complementary products.",
    type: "list.product_reference", ownerType: PRODUCT
  }) { createdDefinition { id key } userErrors { field message code } }
}'
```

If a definition already exists, its `userErrors` entry says so and the rest still succeed.

## 3. Fill in products

- **Release date:** set `Release date` on upcoming and recent games. Future dates show "Pre-order" and "Releases ...". Dates in the last 30 days (a theme setting) show "New release".
- **Other editions:** on each edition of a game, list the other products. Link them in both directions.
- **Complete your setup:** nothing to do if you use complementary products in the Search & Discovery app. Use `Setup items` only to override them for a product.

## 4. Pages and sections

- **Release calendar:** create a page, choose the `page.release-calendar` template and pick a collection (it checks the first 50 products).
- **My Platform on the home page:** in each Collection tiles block, set "Prioritize for platform" so that tile moves first for shoppers on that platform.

## Pre-orders and payments

The "Pre-order" button label is only a label. To charge now or later, use Shopify's pre-order selling plans or set the product to continue selling when out of stock. The theme already shows selling plans on the product page and cart.
