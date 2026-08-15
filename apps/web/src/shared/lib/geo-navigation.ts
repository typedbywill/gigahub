export function getWazeUrl(
  lat?: number,
  lng?: number,
  address?: string,
): string {
  if (lat !== undefined && lng !== undefined) {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
  if (address) {
    return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  }
  return '#';
}

export function getGoogleMapsUrl(
  lat?: number,
  lng?: number,
  address?: string,
): string {
  if (lat !== undefined && lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return '#';
}

export function getCleanPhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function getWhatsAppUrl(phone?: string, text?: string): string {
  const clean = getCleanPhone(phone);
  if (!clean) return '#';
  const fullPhone = clean.length <= 11 ? `55${clean}` : clean;
  const msgParam = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${fullPhone}${msgParam}`;
}

export function getTelUrl(phone?: string): string {
  const clean = getCleanPhone(phone);
  return clean ? `tel:${clean}` : '#';
}
