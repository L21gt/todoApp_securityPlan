// tests/integration/encryption.test.js
const { encrypt, decrypt } = require("../../src/security/encryption");

describe("Pruebas Unitarias - Utilidad de Cifrado", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    // Inyectamos una llave temporal válida solo para asegurar que la prueba corra en cualquier entorno
    process.env.ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterAll(() => {
    // Restauramos el entorno
    process.env.ENCRYPTION_KEY = originalKey;
  });

  test("1. Cifrado y descifrado bidireccional exitoso", () => {
    const textoPlano = "secreto de prueba";
    const textoCifrado = encrypt(textoPlano);

    expect(textoCifrado).not.toBe(textoPlano);
    expect(textoCifrado.includes("::")).toBe(true);

    const textoDescifrado = decrypt(textoCifrado);
    expect(textoDescifrado).toBe(textoPlano);
  });

  test("2. Idempotencia (Prevención de doble cifrado/descifrado)", () => {
    const textoPlano = "secreto de prueba";
    const textoCifrado = encrypt(textoPlano);

    // Intentar cifrar algo ya cifrado debe devolver lo mismo
    expect(encrypt(textoCifrado)).toBe(textoCifrado);
    // Intentar descifrar algo en texto plano debe devolver lo mismo
    expect(decrypt(textoPlano)).toBe(textoPlano);
  });

  test("3. Manejo seguro de valores nulos o vacíos", () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt("")).toBe("");
    expect(decrypt(null)).toBeNull();
    expect(decrypt("")).toBe("");
  });

  test("4. Falla controlada por ausencia de llave criptográfica", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("texto")).toThrow(
      "ENCRYPTION_KEY no esta definida en las variables de entorno",
    );

    // Restauramos inmediatamente para no afectar a otras pruebas
    process.env.ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });
});
