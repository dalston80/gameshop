/* Cart page: applies typed quantity changes. Without JavaScript the "Update cart" button handles it. */
document.addEventListener('change', async (event) => {
  const input = event.target.closest('.main-cart__form .quantity__input');
  // Ignore the synthetic change events fired by the +/- buttons; those use data-cart-change.
  if (!input || !event.isTrusted) return;

  const control = input.closest('quantity-input')?.querySelector('[data-line]');
  const cart = window.GameShopCart;
  if (!control || !cart) return;

  const quantity = Math.max(0, parseInt(input.value, 10) || 0);
  input.setAttribute('aria-busy', 'true');
  try {
    await cart.change(Number(control.dataset.line), quantity);
    window.location.reload();
  } catch (error) {
    input.removeAttribute('aria-busy');
    const region = document.querySelector('[data-live-region]');
    if (region) region.textContent = error.message;
  }
});
