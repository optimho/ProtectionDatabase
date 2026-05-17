/**
 * lib/kks.ts — KKS identifier assembly and parsing
 *
 * KKS (Kraftwerk-Kennzeichensystem) is the international power station
 * identification system. Every piece of plant equipment has a unique KKS
 * code that encodes its location in the station hierarchy:
 *
 *   Station  Unit  SystemCode SystemNo  EquipCode EquipNo  - CompCode CompNo
 *   THI      1     BBA        01        AP         001     - EY        01
 *   ───────────────────────────────────────────────────────────────────────
 *   Result: THI1BBA01AP001-EY01
 *
 * Storing the eight parts individually allows SQL filtering by any level
 * of the hierarchy (e.g. all relays at station THI, or all relays in unit
 * 1 at THI). The assembled kks_full is stored as a UNIQUE column to prevent
 * duplicate devices and enable fast exact-match lookups.
 */

export interface KKSParts {
  kks_station: string;              // 3 uppercase letters  e.g. THI
  kks_unit: string;                 // 1 digit              e.g. 1
  kks_system_code: string;          // 3 uppercase letters  e.g. BBA
  kks_system_number: string;        // 2 digits             e.g. 01
  kks_equipment_unit_code: string;  // 2 uppercase letters  e.g. AP
  kks_equipment_number: string;     // 3 digits             e.g. 001
  kks_component_code: string;       // 2 uppercase letters  e.g. EY
  kks_component_number: string;     // 2 digits             e.g. 01
}

/**
 * Assemble the eight KKS parts into the canonical full string.
 * All alphabetic parts are uppercased to enforce consistency
 * regardless of how the user typed them.
 */
export function assembleKKS(parts: KKSParts): string {
  return (
    parts.kks_station.toUpperCase() +
    parts.kks_unit +
    parts.kks_system_code.toUpperCase() +
    parts.kks_system_number +
    parts.kks_equipment_unit_code.toUpperCase() +
    parts.kks_equipment_number +
    "-" +
    parts.kks_component_code.toUpperCase() +
    parts.kks_component_number
  );
}

/**
 * Parse a full KKS string back into its eight component parts.
 * Returns null if the string doesn't match the expected format.
 *
 * Expected format: AAA0BBB00CC000-DD00 (19 characters including dash)
 */
export function parseKKS(kks: string): KKSParts | null {
  const re = /^([A-Z]{3})(\d)([A-Z]{3})(\d{2})([A-Z]{2})(\d{3})-([A-Z]{2})(\d{2})$/i;
  const m = kks.match(re);
  if (!m) return null;
  return {
    kks_station: m[1].toUpperCase(),
    kks_unit: m[2],
    kks_system_code: m[3].toUpperCase(),
    kks_system_number: m[4],
    kks_equipment_unit_code: m[5].toUpperCase(),
    kks_equipment_number: m[6],
    kks_component_code: m[7].toUpperCase(),
    kks_component_number: m[8],
  };
}
