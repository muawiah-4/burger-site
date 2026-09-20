export function isValidName(value: string): boolean {
  return value.trim().length >= 2;
}

export function isValidPhone(value: string): boolean {
  return /^[0-9+()\-\s]{7,}$/.test(value.trim());
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidZip(value: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(value.trim());
}

export function isValidCardNumber(value: string): boolean {
  const digits = value.replace(/\s/g, "");
  return /^\d{15,16}$/.test(digits);
}

export function isValidExpiry(value: string): boolean {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = Number(match[2]) + 2000;
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expiryDate = new Date(year, month, 0);
  return expiryDate.getTime() >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

export function isValidCvc(value: string): boolean {
  return /^\d{3,4}$/.test(value.trim());
}
