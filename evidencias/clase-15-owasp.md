# Evidencia Clase 15: Checklist OWASP API Security Top 10

| #         | Vulnerabilidad                         | ¿Mitigada? | Dónde en el código                                                                                    |
| :-------- | :------------------------------------- | :--------- | :---------------------------------------------------------------------------------------------------- |
| **API1**  | Broken Object Level Authorization      | Sí         | Middleware `checkPermission.js` (valida membresía y roles antes de consultar DB).                     |
| **API2**  | Broken Authentication                  | Sí         | `auth.js` y `tokenService.js` (JWT corta duración y refresh tokens seguros).                          |
| **API3**  | Broken Object Property Level Auth      | Sí         | `tarea.validator.js` (Joi `unknown(false)` restringe campos) y Mongoose Selects (oculta contraseñas). |
| **API4**  | Unrestricted Resource Consumption      | Sí         | `app.js` (límite 10kb body) y `rateLimiter.js` (limita peticiones por IP).                            |
| **API5**  | Broken Function Level Authorization    | Sí         | `admin.js` (`checkSuperAdmin`) y `<AdminRoute>` en frontend bloquean acceso no autorizado.            |
| **API6**  | Unrestricted Access to Sensitive Flows | Sí         | Sólo `super_admin` puede acceder a `/api/admin/*` y a desactivar cuentas.                             |
| **API7**  | Server Side Request Forgery            | N/A        | La API no realiza peticiones salientes a recursos internos basados en input de usuario.               |
| **API8**  | Security Misconfiguration              | Sí         | `app.js` (Helmet, CORS con allowlist) y manejo centralizado de errores sin stack traces expuestos.    |
| **API9**  | Improper Inventory Management          | Sí         | Código modular estructurado en rutas específicas y versionado bajo Git.                               |
| **API10** | Unsafe Consumption of APIs             | Sí         | Frontend utiliza `DOMPurify` (sanitización de inputs) para evitar inyección desde el cliente.         |
