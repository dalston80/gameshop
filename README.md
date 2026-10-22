# GameShop

An original Shopify Online Store 2.0 theme for video game, console and PC hardware retailers.

Built from Shopify's [Skeleton theme](https://github.com/Shopify/skeleton-theme) (MIT, see [LICENSE.md](LICENSE.md)). The theme contains no Dawn or Horizon code.

## Highlights

- **Platform-first identity.** Tag products with a platform tag (`playstation`, `xbox`, `nintendo`, `pc` by default) and cards, product pages and collections show a colored platform badge. Names, tags and colors are editable in Theme settings > Platforms.
- **No apps required.** Filtering, sorting, predictive search, recommendations, recently viewed, cart drawer, newsletter, accelerated checkout, pickup availability, Shop Pay Installments, gift cards, selling plans and unit pricing are all built in. Product ratings display automatically when a review app writes the standard `reviews.rating` and `reviews.rating_count` metafields. App blocks are supported in the product and featured product sections.
- **Accessible by default.** Accessible color palette, visible focus, keyboard navigation, reduced motion support, no autoplay without a pause control.

## Development

Shopify CLI requires Node 20 or newer.

```bash
npx @shopify/cli theme dev --store <your-store>.myshopify.com
npx @shopify/cli theme check
```

## Gaming features

These need no app. Each one hides itself when its data is missing.

| Feature | What it does | Data it reads |
|---|---|---|
| **My Platform** | Header button where shoppers pick PlayStation, Xbox, Nintendo or PC. Products for that platform show a "Works with your ..." chip, and home page tiles can move the chosen platform first. Saved in the browser only. | Product tags that match the tags in Theme settings > Platforms (a product can have several) |
| **Release dates and pre-orders** | "Pre-order" and "New release" badges, a "Releases Oct 31, 2026" line on the product page and cart, a "Pre-order" button label for future releases, and a Release calendar section (add it to any page, or use the `page.release-calendar` template). | `custom.release_date` product metafield (type: Date) |
| **Complete your setup** | Product page box with checkboxes, a combined total and one Add all to cart button. Adds the items in one request. It shows the plain sum of prices and never claims a bundle discount. | Complementary products (configured in the free Search & Discovery app), or the optional `custom.setup_items` metafield |
| **Editions and platforms** | "Also available on" links between related products such as the PS5 and Xbox editions of one game. A "Platform" variant option also works on its own. | `custom.other_editions` product metafield (type: list of products) |

### Metafields to create

Shopify themes cannot create metafield definitions, so create them once in **Settings > Custom data > Products**, or follow [docs/gaming-setup.md](docs/gaming-setup.md).

| Name | Namespace and key | Type |
|---|---|---|
| Release date | `custom.release_date` | Date |
| Other editions and platforms | `custom.other_editions` | Product, list |
| Setup items (optional) | `custom.setup_items` | Product, list |

Product ratings use the standard `reviews.rating` and `reviews.rating_count` metafields that review apps write.

## Merchant setup notes

- Filters on collection and search pages are configured in the Shopify Search & Discovery app (a free Shopify app). The theme renders whatever filters are configured.
- Create a "Main menu" with up to three levels. The same menu drives the desktop navigation, mobile drawer and breadcrumbs.
- The header offers country and language selectors automatically once more than one is enabled in Settings > Markets.
