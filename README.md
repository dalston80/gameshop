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

## Merchant setup notes

- Filters on collection and search pages are configured in the Shopify Search & Discovery app (a free Shopify app). The theme renders whatever filters are configured.
- Create a "Main menu" with up to three levels. The same menu drives the desktop navigation, mobile drawer and breadcrumbs.
- The header offers country and language selectors automatically once more than one is enabled in Settings > Markets.
