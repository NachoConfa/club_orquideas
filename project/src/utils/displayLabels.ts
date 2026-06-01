const normalizeDisplayValue = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const getCategoryDisplayLabel = (category?: string) => {
  const normalizedCategory = normalizeDisplayValue(category);

  if (
    normalizedCategory.includes('accesor') ||
    normalizedCategory === 'accessories' ||
    normalizedCategory === 'otros' ||
    normalizedCategory === 'eventos' ||
    normalizedCategory.includes('evento')
  ) {
    return 'Eventos';
  }

  return category || 'Producto';
};
