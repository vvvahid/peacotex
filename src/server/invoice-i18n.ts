import "server-only";
import type { Locale } from "@/i18n/config";

/*
 * Invoice wording. The seller is in Flanders, so every label is printed in Dutch, followed by the
 * customer's language ("Factuur / Invoice"); a Dutch-language order gets Dutch only.
 */
export interface InvoiceText {
  invoice: string; number: string; date: string; order: string; seller: string; billTo: string; shipTo: string;
  vatNo: string; description: string; qty: string; amountIncl: string; amountExcl: string; shipping: string;
  totalExcl: string; vat: string; totalIncl: string; total: string; paid: string; vatInEur: string;
  reverseCharge: string; export: string; bank: string; thanks: string;
}

export const INVOICE_TEXT: Record<Locale, InvoiceText> = {
  nl: {
    invoice: "Factuur", number: "Factuurnummer", date: "Factuurdatum", order: "Bestelling", seller: "Verkoper", billTo: "Factuuradres", shipTo: "Leveradres",
    vatNo: "Btw-nummer", description: "Omschrijving", qty: "Aantal", amountIncl: "Bedrag incl. btw", amountExcl: "Bedrag excl. btw", shipping: "Verzending",
    totalExcl: "Totaal excl. btw", vat: "Btw", totalIncl: "Totaal incl. btw", total: "Totaal", paid: "Volledig betaald op {date} via Stripe.",
    vatInEur: "Btw in EUR (koers {rate}): {amount}",
    reverseCharge: "Btw verlegd – intracommunautaire levering, vrijgesteld van btw (art. 39bis W.BTW; art. 138 Richtlijn 2006/112/EG).",
    export: "Vrijgesteld van btw – uitvoer van goederen (art. 39 W.BTW; art. 146 Richtlijn 2006/112/EG).",
    bank: "Bank", thanks: "Bedankt voor je bestelling.",
  },
  en: {
    invoice: "Invoice", number: "Invoice number", date: "Invoice date", order: "Order", seller: "Seller", billTo: "Bill to", shipTo: "Ship to",
    vatNo: "VAT number", description: "Description", qty: "Qty", amountIncl: "Amount incl. VAT", amountExcl: "Amount excl. VAT", shipping: "Shipping",
    totalExcl: "Total excl. VAT", vat: "VAT", totalIncl: "Total incl. VAT", total: "Total", paid: "Paid in full on {date} via Stripe.",
    vatInEur: "VAT in EUR (rate {rate}): {amount}",
    reverseCharge: "VAT reverse charge – intra-Community supply exempt from VAT (Article 138 Directive 2006/112/EC).",
    export: "VAT exempt – export of goods (Article 146 Directive 2006/112/EC).",
    bank: "Bank", thanks: "Thank you for your order.",
  },
  de: {
    invoice: "Rechnung", number: "Rechnungsnummer", date: "Rechnungsdatum", order: "Bestellung", seller: "Verkäufer", billTo: "Rechnungsadresse", shipTo: "Lieferadresse",
    vatNo: "USt-IdNr.", description: "Beschreibung", qty: "Menge", amountIncl: "Betrag inkl. MwSt.", amountExcl: "Betrag exkl. MwSt.", shipping: "Versand",
    totalExcl: "Summe netto", vat: "MwSt.", totalIncl: "Summe brutto", total: "Summe", paid: "Vollständig bezahlt am {date} über Stripe.",
    vatInEur: "MwSt. in EUR (Kurs {rate}): {amount}",
    reverseCharge: "Steuerschuldnerschaft des Leistungsempfängers – innergemeinschaftliche Lieferung, steuerfrei (Art. 138 Richtlinie 2006/112/EG).",
    export: "Steuerfrei – Ausfuhrlieferung (Art. 146 Richtlinie 2006/112/EG).",
    bank: "Bank", thanks: "Vielen Dank für Ihre Bestellung.",
  },
  fr: {
    invoice: "Facture", number: "Numéro de facture", date: "Date de facture", order: "Commande", seller: "Vendeur", billTo: "Facturé à", shipTo: "Livré à",
    vatNo: "N° de TVA", description: "Description", qty: "Qté", amountIncl: "Montant TTC", amountExcl: "Montant HT", shipping: "Livraison",
    totalExcl: "Total HT", vat: "TVA", totalIncl: "Total TTC", total: "Total", paid: "Payée intégralement le {date} via Stripe.",
    vatInEur: "TVA en EUR (taux {rate}) : {amount}",
    reverseCharge: "Autoliquidation – livraison intracommunautaire exonérée de TVA (article 138 de la directive 2006/112/CE).",
    export: "Exonération de TVA – exportation de biens (article 146 de la directive 2006/112/CE).",
    bank: "Banque", thanks: "Merci pour votre commande.",
  },
  pl: {
    invoice: "Faktura", number: "Numer faktury", date: "Data faktury", order: "Zamówienie", seller: "Sprzedawca", billTo: "Nabywca", shipTo: "Adres dostawy",
    vatNo: "NIP UE", description: "Opis", qty: "Ilość", amountIncl: "Kwota brutto", amountExcl: "Kwota netto", shipping: "Wysyłka",
    totalExcl: "Razem netto", vat: "VAT", totalIncl: "Razem brutto", total: "Razem", paid: "Zapłacono w całości {date} przez Stripe.",
    vatInEur: "VAT w EUR (kurs {rate}): {amount}",
    reverseCharge: "Odwrotne obciążenie – wewnątrzwspólnotowa dostawa towarów zwolniona z VAT (art. 138 dyrektywy 2006/112/WE).",
    export: "Zwolnione z VAT – eksport towarów (art. 146 dyrektywy 2006/112/WE).",
    bank: "Bank", thanks: "Dziękujemy za zamówienie.",
  },
  ro: {
    invoice: "Factură", number: "Număr factură", date: "Data facturii", order: "Comandă", seller: "Vânzător", billTo: "Cumpărător", shipTo: "Adresa de livrare",
    vatNo: "Cod TVA", description: "Descriere", qty: "Cant.", amountIncl: "Valoare cu TVA", amountExcl: "Valoare fără TVA", shipping: "Livrare",
    totalExcl: "Total fără TVA", vat: "TVA", totalIncl: "Total cu TVA", total: "Total", paid: "Plătită integral la {date} prin Stripe.",
    vatInEur: "TVA în EUR (curs {rate}): {amount}",
    reverseCharge: "Taxare inversă – livrare intracomunitară scutită de TVA (art. 138 din Directiva 2006/112/CE).",
    export: "Scutit de TVA – export de bunuri (art. 146 din Directiva 2006/112/CE).",
    bank: "Bancă", thanks: "Vă mulțumim pentru comandă.",
  },
  cs: {
    invoice: "Faktura", number: "Číslo faktury", date: "Datum vystavení", order: "Objednávka", seller: "Prodávající", billTo: "Odběratel", shipTo: "Dodací adresa",
    vatNo: "DIČ", description: "Popis", qty: "Množství", amountIncl: "Částka s DPH", amountExcl: "Částka bez DPH", shipping: "Doprava",
    totalExcl: "Celkem bez DPH", vat: "DPH", totalIncl: "Celkem s DPH", total: "Celkem", paid: "Uhrazeno v plné výši {date} přes Stripe.",
    vatInEur: "DPH v EUR (kurz {rate}): {amount}",
    reverseCharge: "Přenesení daňové povinnosti – dodání zboží do jiného členského státu osvobozené od DPH (čl. 138 směrnice 2006/112/ES).",
    export: "Osvobozeno od DPH – vývoz zboží (čl. 146 směrnice 2006/112/ES).",
    bank: "Banka", thanks: "Děkujeme za objednávku.",
  },
  hu: {
    invoice: "Számla", number: "Számlaszám", date: "Kiállítás dátuma", order: "Rendelés", seller: "Eladó", billTo: "Vevő", shipTo: "Szállítási cím",
    vatNo: "Közösségi adószám", description: "Megnevezés", qty: "Mennyiség", amountIncl: "Bruttó összeg", amountExcl: "Nettó összeg", shipping: "Szállítás",
    totalExcl: "Nettó összesen", vat: "ÁFA", totalIncl: "Bruttó összesen", total: "Összesen", paid: "Teljes egészében kifizetve: {date}, Stripe-on keresztül.",
    vatInEur: "ÁFA EUR-ban (árfolyam {rate}): {amount}",
    reverseCharge: "Fordított adózás – Közösségen belüli termékértékesítés, ÁFA-mentes (2006/112/EK irányelv 138. cikk).",
    export: "ÁFA-mentes – termékexport (2006/112/EK irányelv 146. cikk).",
    bank: "Bank", thanks: "Köszönjük a rendelését.",
  },
  sv: {
    invoice: "Faktura", number: "Fakturanummer", date: "Fakturadatum", order: "Beställning", seller: "Säljare", billTo: "Faktureras till", shipTo: "Leveransadress",
    vatNo: "Momsreg.nr", description: "Beskrivning", qty: "Antal", amountIncl: "Belopp inkl. moms", amountExcl: "Belopp exkl. moms", shipping: "Frakt",
    totalExcl: "Summa exkl. moms", vat: "Moms", totalIncl: "Summa inkl. moms", total: "Summa", paid: "Betald i sin helhet {date} via Stripe.",
    vatInEur: "Moms i EUR (kurs {rate}): {amount}",
    reverseCharge: "Omvänd skattskyldighet – gemenskapsintern leverans, undantagen från moms (artikel 138 direktiv 2006/112/EG).",
    export: "Momsfri – export av varor (artikel 146 direktiv 2006/112/EG).",
    bank: "Bank", thanks: "Tack för din beställning.",
  },
  da: {
    invoice: "Faktura", number: "Fakturanummer", date: "Fakturadato", order: "Bestilling", seller: "Sælger", billTo: "Faktureres til", shipTo: "Leveringsadresse",
    vatNo: "Momsnummer", description: "Beskrivelse", qty: "Antal", amountIncl: "Beløb inkl. moms", amountExcl: "Beløb ekskl. moms", shipping: "Forsendelse",
    totalExcl: "I alt ekskl. moms", vat: "Moms", totalIncl: "I alt inkl. moms", total: "I alt", paid: "Betalt fuldt ud {date} via Stripe.",
    vatInEur: "Moms i EUR (kurs {rate}): {amount}",
    reverseCharge: "Omvendt betalingspligt – momsfritaget levering inden for EU (artikel 138 i direktiv 2006/112/EF).",
    export: "Momsfri – eksport af varer (artikel 146 i direktiv 2006/112/EF).",
    bank: "Bank", thanks: "Tak for din bestilling.",
  },
  fi: {
    invoice: "Lasku", number: "Laskun numero", date: "Laskun päivämäärä", order: "Tilaus", seller: "Myyjä", billTo: "Laskutetaan", shipTo: "Toimitusosoite",
    vatNo: "ALV-tunniste", description: "Kuvaus", qty: "Määrä", amountIncl: "Summa sis. ALV", amountExcl: "Summa ilman ALV:tä", shipping: "Toimitus",
    totalExcl: "Yhteensä ilman ALV:tä", vat: "ALV", totalIncl: "Yhteensä sis. ALV", total: "Yhteensä", paid: "Maksettu kokonaan {date} Stripen kautta.",
    vatInEur: "ALV euroina (kurssi {rate}): {amount}",
    reverseCharge: "Käännetty verovelvollisuus – ALV-vapaa yhteisömyynti (direktiivin 2006/112/EY 138 artikla).",
    export: "ALV-vapaa – tavaroiden vienti (direktiivin 2006/112/EY 146 artikla).",
    bank: "Pankki", thanks: "Kiitos tilauksestasi.",
  },
  nb: {
    invoice: "Faktura", number: "Fakturanummer", date: "Fakturadato", order: "Bestilling", seller: "Selger", billTo: "Faktureres til", shipTo: "Leveringsadresse",
    vatNo: "Org.nr / MVA", description: "Beskrivelse", qty: "Antall", amountIncl: "Beløp inkl. mva.", amountExcl: "Beløp ekskl. mva.", shipping: "Frakt",
    totalExcl: "Sum ekskl. mva.", vat: "Mva.", totalIncl: "Sum inkl. mva.", total: "Sum", paid: "Betalt i sin helhet {date} via Stripe.",
    vatInEur: "Mva. i EUR (kurs {rate}): {amount}",
    reverseCharge: "Omvendt avgiftsplikt – mva.-fritatt levering innenfor EU (artikkel 138 i direktiv 2006/112/EF).",
    export: "Fritatt for mva. – eksport av varer (artikkel 146 i direktiv 2006/112/EF).",
    bank: "Bank", thanks: "Takk for bestillingen.",
  },
};

/** "Factuur / Invoice": Dutch, then the customer's language (once only for Dutch orders). */
export function bilingual(lang: Locale) {
  const nl = INVOICE_TEXT.nl, other = INVOICE_TEXT[lang];
  return (key: keyof InvoiceText) => (lang === "nl" || nl[key] === other[key] ? nl[key] : `${nl[key]} / ${other[key]}`);
}
