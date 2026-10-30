/*
 * The seller. Peacotex is the trade name of LeoPers BV's fabric business. These details are
 * required on invoices and on the site (EU e-commerce rules), so they live in one place.
 */
export const COMPANY = {
  tradeName: "Peacotex",
  legalName: "LeoPers BV",
  street: "Herenhoef 4",
  postcode: "3950",
  city: "Bocholt",
  country: "Belgium",
  countryCode: "BE",
  enterpriseNumber: "0801.834.860",
  vatNumber: "BE 0801.834.860",
  register: "RPR Antwerpen, afdeling Hasselt",
  bank: "Argenta",
  iban: "BE55 9734 5365 0644",
  bic: "ARSPBE22XXX",
  email: "sales@peacotex.com",
  web: "peacotex.com",
} as const;

export const companyAddress = `${COMPANY.street}, ${COMPANY.postcode} ${COMPANY.city}, ${COMPANY.country}`;
