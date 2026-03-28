export interface Country {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  dialCode: string;
  flag: string;
}

// helper to convert ISO code to emoji flag
function flagEmoji(code: string) {
  const OFFSET = 0x1f1e6 - 65;
  return Array.from(code.toUpperCase()).
    map(c => String.fromCodePoint(c.charCodeAt(0) + OFFSET)).
    join('');
}

// curated list of countries with their dialing codes.  You can expand this array
// in the future if you need additional regions; the `flag` is computed
// automatically.
export const countries: Country[] = [
  { name: 'Afghanistan', code: 'AF', dialCode: '+93', flag: flagEmoji('AF') },
  { name: 'Albania', code: 'AL', dialCode: '+355', flag: flagEmoji('AL') },
  { name: 'Algeria', code: 'DZ', dialCode: '+213', flag: flagEmoji('DZ') },
  { name: 'Angola', code: 'AO', dialCode: '+244', flag: flagEmoji('AO') },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: flagEmoji('AR') },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: flagEmoji('AU') },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: flagEmoji('AT') },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: flagEmoji('BD') },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: flagEmoji('BE') },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: flagEmoji('BR') },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: flagEmoji('CA') },
  { name: 'Cameroon', code: 'CM', dialCode: '+237', flag: flagEmoji('CM') },
  { name: 'China', code: 'CN', dialCode: '+86', flag: flagEmoji('CN') },
  { name: 'Colombia', code: 'CO', dialCode: '+57', flag: flagEmoji('CO') },
  { name: 'Croatia', code: 'HR', dialCode: '+385', flag: flagEmoji('HR') },
  { name: 'Czech Republic', code: 'CZ', dialCode: '+420', flag: flagEmoji('CZ') },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: flagEmoji('DK') },
  { name: 'DRC', code: 'CD', dialCode: '+243', flag: flagEmoji('CD') },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: flagEmoji('EG') },
  { name: 'Ethiopia', code: 'ET', dialCode: '+251', flag: flagEmoji('ET') },
  { name: 'Finland', code: 'FI', dialCode: '+358', flag: flagEmoji('FI') },
  { name: 'France', code: 'FR', dialCode: '+33', flag: flagEmoji('FR') },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: flagEmoji('DE') },
  { name: 'Ghana', code: 'GH', dialCode: '+233', flag: flagEmoji('GH') },
  { name: 'Greece', code: 'GR', dialCode: '+30', flag: flagEmoji('GR') },
  { name: 'Hungary', code: 'HU', dialCode: '+36', flag: flagEmoji('HU') },
  { name: 'India', code: 'IN', dialCode: '+91', flag: flagEmoji('IN') },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: flagEmoji('ID') },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: flagEmoji('IE') },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: flagEmoji('IL') },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: flagEmoji('IT') },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: flagEmoji('JP') },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: flagEmoji('KE') },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: flagEmoji('MY') },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: flagEmoji('MX') },
  { name: 'Morocco', code: 'MA', dialCode: '+212', flag: flagEmoji('MA') },
  { name: 'Mozambique', code: 'MZ', dialCode: '+258', flag: flagEmoji('MZ') },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: flagEmoji('NL') },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: flagEmoji('NZ') },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: flagEmoji('NG') },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: flagEmoji('NO') },
  { name: 'Oman', code: 'OM', dialCode: '+968', flag: flagEmoji('OM') },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: flagEmoji('PK') },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: flagEmoji('PL') },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: flagEmoji('PT') },
  { name: 'Rwanda', code: 'RW', dialCode: '+250', flag: flagEmoji('RW') },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: flagEmoji('SA') },
  { name: 'Senegal', code: 'SN', dialCode: '+221', flag: flagEmoji('SN') },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: flagEmoji('ZA') },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: flagEmoji('KR') },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: flagEmoji('ES') },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: flagEmoji('SE') },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: flagEmoji('CH') },
  { name: 'Tanzania', code: 'TZ', dialCode: '+255', flag: flagEmoji('TZ') },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: flagEmoji('TH') },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: flagEmoji('TR') },
  { name: 'Uganda', code: 'UG', dialCode: '+256', flag: flagEmoji('UG') },
  { name: 'Ukraine', code: 'UA', dialCode: '+380', flag: flagEmoji('UA') },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: flagEmoji('AE') },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: flagEmoji('GB') },
  { name: 'United States', code: 'US', dialCode: '+1', flag: flagEmoji('US') },
  { name: 'Zambia', code: 'ZM', dialCode: '+260', flag: flagEmoji('ZM') },
  { name: 'Zimbabwe', code: 'ZW', dialCode: '+263', flag: flagEmoji('ZW') },
];

// Phone number format by country (digits required for local number)
export const phoneFormats: Record<string, { digits: number; placeholder: string }> = {
  'South Africa': { digits: 9, placeholder: '812345678' },
  'Nigeria': { digits: 9, placeholder: '801234567' },
  'Kenya': { digits: 9, placeholder: '712345678' },
  'Ghana': { digits: 9, placeholder: '241234567' },
  'Ethiopia': { digits: 9, placeholder: '912345678' },
  'Tanzania': { digits: 9, placeholder: '712345678' },
  'Uganda': { digits: 9, placeholder: '712345678' },
  'Zimbabwe': { digits: 9, placeholder: '712345678' },
  'Mozambique': { digits: 9, placeholder: '841234567' },
  'Zambia': { digits: 9, placeholder: '971234567' },
  'DRC': { digits: 9, placeholder: '812345678' },
  'Cameroon': { digits: 9, placeholder: '671234567' },
  'Rwanda': { digits: 9, placeholder: '781234567' },
  'Malawi': { digits: 9, placeholder: '991234567' },
};

// Get phone config for a country
export function getPhoneConfig(countryName: string) {
  const country = countries.find(c => c.name === countryName);
  if (!country) return null;
  
  const format = phoneFormats[countryName] || { digits: 9, placeholder: '123456789' };
  return {
    dialCode: country.dialCode,
    flag: country.flag,
    digits: format.digits,
    placeholder: format.placeholder,
  };
}
