// src/security/encryption.js
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const SEPARATOR = "::";

const getKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key)
    throw new Error(
      "ENCRYPTION_KEY no esta definida en las variables de entorno",
    );
  return Buffer.from(key, "hex");
};

const encrypt = (text) => {
  if (!text) return text;
  // Validacion de idempotencia para evitar doble cifrado
  if (text.includes(SEPARATOR)) return text;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return `${iv.toString("base64")}${SEPARATOR}${authTag}${SEPARATOR}${encrypted}`;
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;
  // Si no contiene el separador, se asume que es texto plano y se retorna directamente
  if (!encryptedText.includes(SEPARATOR)) return encryptedText;

  const [ivBase64, authTagBase64, ciphertext] = encryptedText.split(SEPARATOR);

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

module.exports = { encrypt, decrypt };
