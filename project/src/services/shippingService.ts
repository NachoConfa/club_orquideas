export type ShippingMethod = 'pickup' | 'uber' | 'encomienda';

export interface ShippingZone {
  id: string;
  name: string;
  province: string | null;
  city_keywords: string[];
  method: Exclude<ShippingMethod, 'pickup'>;
  price: number;
  requires_quote: boolean;
  sort_order: number;
}

export interface ShippingQuote {
  method: ShippingMethod;
  amount: number;
  requiresQuote: boolean;
  label: string;
  description: string;
  zoneId?: string;
  zoneName?: string;
}

const SHIPPING_QUERY_TIMEOUT_MS = 10000;

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:/\\|()[\]{}_-]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const getProvinceAliases = (value: string) => {
  const normalizedValue = normalize(value);

  if (!normalizedValue) {
    return [];
  }

  if (
    [
      'caba',
      'capital federal',
      'ciudad autonoma de buenos aires',
      'ciudad de buenos aires',
      'buenos aires capital',
    ].includes(normalizedValue)
  ) {
    return ['caba', 'capital federal', 'ciudad autonoma de buenos aires', 'ciudad de buenos aires'];
  }

  if (['buenos aires', 'bs as', 'bsas', 'provincia de buenos aires', 'pba'].includes(normalizedValue)) {
    return ['buenos aires', 'bs as', 'bsas', 'provincia de buenos aires', 'pba'];
  }

  return [normalizedValue];
};

const valuesMatch = (left: string, right: string) => {
  if (!left || !right) {
    return false;
  }

  return left === right || (right.length >= 4 && left.includes(right)) || (left.length >= 4 && right.includes(left));
};

const provincesMatch = (zoneProvince: string | null, customerProvince: string) => {
  if (!zoneProvince) {
    return true;
  }

  const zoneAliases = getProvinceAliases(zoneProvince);
  const customerAliases = getProvinceAliases(customerProvince);

  return zoneAliases.some((zoneAlias) =>
    customerAliases.some((customerAlias) => valuesMatch(zoneAlias, customerAlias))
  );
};

const parseCityKeywords = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).map((keyword) => keyword.trim()).filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(trimmedValue);
    if (Array.isArray(parsedValue)) {
      return parsedValue.map(String).map((keyword) => keyword.trim()).filter(Boolean);
    }
  } catch {
    // Supabase should return text[] as an array, but manually-created tables sometimes store comma-separated text.
  }

  return trimmedValue
    .replace(/^{|}$/g, '')
    .split(/[,;\n|]+/)
    .map((keyword) => keyword.replace(/^"|"$/g, '').trim())
    .filter(Boolean);
};

const keywordMatchesLocation = (keyword: string, searchText: string, city: string) => {
  const normalizedKeyword = normalize(keyword);
  const normalizedCity = normalize(city);

  if (!normalizedKeyword) {
    return false;
  }

  if (valuesMatch(searchText, normalizedKeyword)) {
    return true;
  }

  if (normalizedCity && valuesMatch(normalizedKeyword, normalizedCity)) {
    return true;
  }

  const keywordParts = normalizedKeyword.split(' ').filter((part) => part.length >= 3);
  return keywordParts.length > 0 && keywordParts.every((part) => searchText.includes(part));
};

const getZonesWithFallbacks = (zones: ShippingZone[]) =>
  [...zones, ...fallbackShippingZones.filter((fallbackZone) => !zones.some((zone) => zone.id === fallbackZone.id))]
    .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));

const pickupQuote: ShippingQuote = {
  method: 'pickup',
  amount: 0,
  requiresQuote: false,
  label: 'Retiro en local',
  description: 'Retiro sin costo en Av. De los Lagos 7000, Nordelta.',
};

const pendingQuote: ShippingQuote = {
  method: 'encomienda',
  amount: 0,
  requiresQuote: true,
  label: 'Encomienda a cotizar',
  description: 'Te confirmaremos el costo final del envio por WhatsApp antes de despachar.',
};

const fallbackShippingZones: ShippingZone[] = [
  {
    id: 'fallback-nordelta-tigre',
    name: 'Nordelta / Tigre cercano',
    province: 'Buenos Aires',
    city_keywords: ['nordelta', 'tigre', 'benavidez', 'dique lujan', 'los sauces'],
    method: 'uber',
    price: 3000,
    requires_quote: false,
    sort_order: 10,
  },
  {
    id: 'fallback-zona-norte-media',
    name: 'Zona Norte media',
    province: 'Buenos Aires',
    city_keywords: ['san fernando', 'victoria', 'san isidro', 'martinez', 'olivos', 'beccar'],
    method: 'uber',
    price: 6000,
    requires_quote: false,
    sort_order: 20,
  },
  {
    id: 'fallback-caba',
    name: 'CABA',
    province: 'CABA',
    city_keywords: ['caba', 'capital federal', 'palermo', 'belgrano', 'recoleta', 'caballito'],
    method: 'uber',
    price: 16000,
    requires_quote: false,
    sort_order: 30,
  },
  {
    id: 'fallback-gba-buenos-aires-lejos',
    name: 'GBA / Buenos Aires lejos',
    province: 'Buenos Aires',
    city_keywords: ['la plata', 'quilmes', 'moron', 'lanus', 'lomas de zamora'],
    method: 'encomienda',
    price: 0,
    requires_quote: true,
    sort_order: 40,
  },
  {
    id: 'fallback-interior',
    name: 'Interior del pais',
    province: null,
    city_keywords: ['cordoba', 'santa fe', 'mendoza', 'tucuman', 'salta', 'neuquen', 'rio negro'],
    method: 'encomienda',
    price: 0,
    requires_quote: true,
    sort_order: 50,
  },
];

const toShippingZones = (data: unknown): ShippingZone[] =>
  (Array.isArray(data) ? data : []).map((zone) => {
    const record = zone as Record<string, unknown>;

    return {
      id: String(record.id),
      name: String(record.name),
      province: record.province ? String(record.province) : null,
      city_keywords: parseCityKeywords(record.city_keywords),
      method: record.method === 'uber' ? 'uber' : 'encomienda',
      price: Number(record.price ?? 0),
      requires_quote: Boolean(record.requires_quote),
      sort_order: Number(record.sort_order ?? 0),
    };
  });

export const getShippingZones = async (): Promise<ShippingZone[]> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return fallbackShippingZones;
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), SHIPPING_QUERY_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/shipping_zones?select=id,name,province,city_keywords,method,price,requires_quote,sort_order&is_active=eq.true&order=sort_order.asc,name.asc`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase respondio ${response.status}`);
    }

    const zones = toShippingZones(await response.json());
    return zones.length > 0 ? getZonesWithFallbacks(zones) : fallbackShippingZones;
  } catch (error) {
    console.warn('No se pudieron cargar zonas desde Supabase. Se usan zonas locales.', error);
    return fallbackShippingZones;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const calculateShippingQuote = (
  deliveryMethod: 'delivery' | 'pickup',
  zones: ShippingZone[],
  city: string,
  province: string,
  address = ''
): ShippingQuote => {
  if (deliveryMethod === 'pickup') {
    return pickupQuote;
  }

  const normalizedCity = normalize(city);
  const normalizedProvince = normalize(province);
  const normalizedAddress = normalize(address);

  if (!normalizedCity || !normalizedProvince) {
    return {
      ...pendingQuote,
      label: 'Completa tu localidad',
      description: 'Carga ciudad y provincia para calcular el envio.',
    };
  }

  const searchText = `${normalizedAddress} ${normalizedCity} ${normalizedProvince}`.trim();
  const availableZones = zones.length > 0 ? zones : fallbackShippingZones;
  const keywordZone = availableZones.find((candidate) => {
    const keywords = candidate.city_keywords.map(normalize).filter(Boolean);
    const provinceMatches = provincesMatch(candidate.province, province);

    return provinceMatches && keywords.some((keyword) => keywordMatchesLocation(keyword, searchText, city));
  });

  const provinceZone = availableZones.find((candidate) => {
    const keywords = candidate.city_keywords.map(normalize).filter(Boolean);

    if (keywords.length > 0 || !candidate.province) {
      return false;
    }

    return provincesMatch(candidate.province, province);
  });

  const zone = keywordZone ?? provinceZone;

  if (!zone) {
    return pendingQuote;
  }

  const methodLabel = zone.method === 'uber' ? 'Uber' : 'Encomienda';

  return {
    method: zone.method,
    amount: zone.requires_quote ? 0 : zone.price,
    requiresQuote: zone.requires_quote,
    label: `${methodLabel}: ${zone.name}`,
    description: zone.requires_quote
      ? 'Este envio requiere cotizacion manual antes de confirmar el pago.'
      : `Envio estimado por ${methodLabel.toLowerCase()} para ${zone.name}.`,
    zoneId: zone.id,
    zoneName: zone.name,
  };
};
