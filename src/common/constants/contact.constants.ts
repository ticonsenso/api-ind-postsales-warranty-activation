/** Longitud máxima de un nombre o apellido. */
export const NAME_MAX_LENGTH = 100;

/** Longitud máxima de un correo electrónico (límite del estándar RFC 5321). */
export const EMAIL_MAX_LENGTH = 254;

/** Longitud mínima de un número de teléfono. */
export const PHONE_MIN_LENGTH = 7;

/** Longitud máxima de un número de teléfono. */
export const PHONE_MAX_LENGTH = 20;

/** Caracteres admitidos en un número de teléfono. */
export const PHONE_PATTERN = /^\+?[0-9 ()-]+$/;
