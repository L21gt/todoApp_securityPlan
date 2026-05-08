# Evidencia Tarea 9 - Rate Limiting

## Curl 1: 6to intento de login -> 429

**Comando ejecutado:**
` ` `bash
curl -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@seguridad.com\",\"password\":\"SuperSecreta123!\"}"
` ` `

**Respuesta obtenida:**

```bash
HTTP/1.1 429 Too Many Requests
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
Access-Control-Allow-Origin: http://localhost:3000
Vary: Origin
RateLimit-Policy: 5;w=900
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 870
Retry-After: 870
Content-Type: application/json; charset=utf-8
Content-Length: 108
ETag: W/"6c-70VcCLKY3ihLWSKKxAiEgL7rnE0"
Date: Thu, 07 May 2026 04:57:51 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Demasiados intentos de inicio de sesión desde esta IP, por favor intente de nuevo en 15 minutos"}
```

## Curl 2: Register 4ta vez desde misma IP -> 429

**Comando ejecutado:**
` ` `bash
curl -i -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"ataque@seguridad.com\",\"password\":\"SuperSecreta123!\"}"
` ` `

**Respuesta obtenida:**

```bash
HTTP/1.1 429 Too Many Requests
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
Access-Control-Allow-Origin: http://localhost:3000
Vary: Origin
RateLimit-Policy: 3;w=3600
RateLimit-Limit: 3
RateLimit-Remaining: 0
RateLimit-Reset: 3581
Retry-After: 3581
Content-Type: application/json; charset=utf-8
Content-Length: 92
ETag: W/"5c-iP+Ohwb70FVCYDXxMxs+6CbICUM"
Date: Thu, 07 May 2026 05:35:10 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Demasiadas cuentas creadas desde esta IP, por favor intente de nuevo en una hora"}
```

## Curl 3: Login dentro del límite

**Comando ejecutado:**
` ` `bash
curl -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@seguridad.com\",\"password\":\"SuperSecreta123!\"}"
` ` `

**Respuesta obtenida:**

```bash
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
Access-Control-Allow-Origin: http://localhost:3000
Vary: Origin
RateLimit-Policy: 5;w=900
RateLimit-Limit: 5
RateLimit-Remaining: 4
RateLimit-Reset: 900
Content-Type: application/json; charset=utf-8
Content-Length: 715
ETag: W/"2cb-JkZehEesrnJJcrBrq+9UOA3g0c4"
Date: Thu, 07 May 2026 05:38:01 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"message":"Login successful","accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWNiNWJiOGJjZmU4M2QxZWExNWVjMjUiLCJlbWFpbCI6ImFkbWluQHNlZ3VyaWRhZC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc3ODEzMjI4MSwiZXhwIjoxNzc4MTMzMTgxfQ.1xrrivc_3CaZGZ9WRAISCGyl1TzAuDEWbEQTsofEdFU","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWNiNWJiOGJjZmU4M2QxZWExNWVjMjUiLCJmYW1pbHlJZCI6ImI1NDIxMjllLTkzY2EtNGQwYS1hOWQ3LTAyMDIyMmFlNTg1NiIsImlhdCI6MTc3ODEzMjI4MSwiZXhwIjoxNzc4NzM3MDgxfQ.RfTiNkTzl96vupVFvc-bsTCEcvtn2Bt8lRKj1IiVJvM","user":{"_id":"69cb5bb8bcfe83d1ea15ec25","email":"admin@seguridad.com","role":"user","createdAt":"2026-03-31T05:29:28.483Z","updatedAt":"2026-03-31T05:29:28.483Z","__v":0}}
```
