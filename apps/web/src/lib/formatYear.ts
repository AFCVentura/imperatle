// ReferenceYear/StartYear/EndYear use astronomical numbering (negative = BCE).
// Century-precision display (e.g. "7th century BCE") is an open design
// question -- see the planning doc -- so for now this only handles the
// BCE/CE sign, not precision-aware formatting.
export function splitAstronomicalYear(year: number): { absoluteYear: number; isBce: boolean } {
  return year < 0 ? { absoluteYear: Math.abs(year), isBce: true } : { absoluteYear: year, isBce: false };
}
