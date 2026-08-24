/** Site-wide chrome: navigation, footer and contact details. */

export const NAV = [
  { slug: 'huisarts', label: 'behandelaar' },
  { slug: 'patient', label: 'patiënt' },
  { slug: 'nieuws', label: 'nieuws' },
  { slug: 'over-ons', label: 'over ons' },
] as const;

export const FOOTER_LINKS = [
  { href: '/pages/privacy', label: 'Privacy Statement & Disclaimer' },
  { href: '/pages/voorwaarden', label: 'General Terms' },
] as const;

export const CONTACT = {
  org: 'RoQua',
  addressLines: ['UMCG, UCP, Ingang 23, KN 4.27', 'Hanzeplein 1', '9713 GZ Groningen'],
  email: 'grip@gripopklachten.nl',
} as const;

export const COPYRIGHT = '© 2023 RoQua All rights reserved';

export const PARTNER = {
  href: 'https://umcg.nl/',
  logoClass: 'umcg-logo',
  label: 'UMCG',
} as const;
