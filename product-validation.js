function validateProductInput(input, existing = null) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Product details must be an object' };
  }

  const name = input.name === undefined ? existing?.name : typeof input.name === 'string' ? input.name.trim() : null;
  const category = input.category === undefined ? existing?.category : typeof input.category === 'string' ? input.category.trim() : null;
  const description = input.description === undefined
    ? existing?.description || ''
    : typeof input.description === 'string' ? input.description.trim() : null;
  const price = input.price === undefined && existing
    ? existing.price
    : typeof input.price === 'string' && input.price.trim() ? Number(input.price) : input.price;

  if (!name || name.length > 160) return { error: 'Name is required and must be 160 characters or fewer' };
  if (!category || category.length > 100) return { error: 'Category is required and must be 100 characters or fewer' };
  if (description === null || description.length > 2000) return { error: 'Description must be 2000 characters or fewer' };
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > Number.MAX_SAFE_INTEGER) {
    return { error: 'Price must be a valid non-negative number' };
  }

  let imageUrl;
  if (input.imageUrl !== undefined) {
    if (typeof input.imageUrl !== 'string') return { error: 'Image URL must be a valid HTTP or HTTPS URL' };
    const rawImageUrl = input.imageUrl.trim();
    if (rawImageUrl) {
      try {
        const parsed = new URL(rawImageUrl);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || rawImageUrl.length > 2048) {
          return { error: 'Image URL must be a valid HTTP or HTTPS URL' };
        }
        imageUrl = parsed.href;
      } catch {
        return { error: 'Image URL must be a valid HTTP or HTTPS URL' };
      }
    }
  }

  return { product: { name, category, description, price }, imageUrl };
}

module.exports = { validateProductInput };