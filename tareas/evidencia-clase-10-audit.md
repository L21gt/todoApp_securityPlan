# Evidencia Tarea 10 - Audit Logs

## Log 1: auth.login.failure

```json
{
  "_id": { "$oid": "6a094c98f2fd847858b754d6" },
  "__v": 0,
  "action": "auth.login.failure",
  "createdAt": { "$date": "2026-05-17T05:05:28.789Z" },
  "details": {
    "reason": "Invalid credentials"
  },
  "ip": "::1",
  "user": "admin@seguridad.com",
  "userAgent": "PostmanRuntime/7.39.1"
}
```

## Log 2: auth.login.success

```json
{
  "_id": { "$oid": "6a094d12f2fd847858b754db" },
  "__v": 0,
  "action": "auth.login.success",
  "createdAt": { "$date": "2026-05-17T05:07:30.144Z" },
  "ip": "::1",
  "user": { "$oid": "69cb5bb8bcfe83d1ea15ec25" },
  "userAgent": "PostmanRuntime/7.39.1"
}
```

## Log 3: security.unauthorized

```json
{
  "_id": { "$oid": "6a094d9af2fd847858b754dd" },
  "__v": 0,
  "action": "security.unauthorized",
  "createdAt": { "$date": "2026-05-17T05:09:46.742Z" },
  "details": {
    "reason": "Invalid or expired token",
    "jwtError": "jwt malformed"
  },
  "ip": "::1",
  "user": null,
  "userAgent": "PostmanRuntime/7.39.1"
}
```
