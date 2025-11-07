/**
 * Convertit une valeur quelconque en nombre.
 * @param {*} value - Valeur à convertir
 * @returns {number} Nombre converti ou 0 si invalide
 */
export const toNumber = value => {
  if (value === undefined || value === null) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Vérifie si une valeur est définie (non null / undefined).
 * @param {*} value
 * @returns {boolean}
 */
export const isDefined = value => value !== undefined && value !== null;
