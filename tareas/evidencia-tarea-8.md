# Evidencia Tarea 8 - Validación de Input y Manejo de Errores

## Login

```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@seguridad.com\",\"password\":\"SuperSecreta123!\"}"
```

## Prueba 1: Crear tarea sin título (Esperado: 422)

Comando ingresado:

```bash
curl -X POST http://localhost:3000/api/tareas -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWNiNWJiOGJjZmU4M2QxZWExNWVjMjUiLCJlbWFpbCI6ImFkbWluQHNlZ3VyaWRhZC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc3Nzc4NjkwNywiZXhwIjoxNzc3Nzg3ODA3fQ.webad3ZJvFh3tsqMeRWSfbO0P67MZp3o59LmXn5vE-E" -H "Content-Type: application/json" -d "{\"completed\": true}"
```

Resultado:

```bash
{
    "error":"Validation error",
    "details":["\"title\" es un campo requerido"]
}
```

## Prueba 2: Crear tarea con título vacío (Esperado: 422)

Comando ingresado:

```bash
curl -X POST http://localhost:3000/api/tareas -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWNiNWJiOGJjZmU4M2QxZWExNWVjMjUiLCJlbWFpbCI6ImFkbWluQHNlZ3VyaWRhZC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc3Nzc4Nzk5MCwiZXhwIjoxNzc3Nzg4ODkwfQ.MIxKBThoDJOXro8mb7RDx7v4B0vNm03RDGM7dMcAf1s" -H "Content-Type: application/json" -d "{\"title\": \"\"}"
```

Resultado:

```bash
{
    "error":"Validation error",
    "details":["\"title\" no puede estar vacío"]
}
```

## Prueba 3: ID inválido (Esperado: 400 sin stack trace)

Comando ingresado:

```bash
curl http://localhost:3000/api/tareas/id-que-no-existe -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWNiNWJiOGJjZmU4M2QxZWExNWVjMjUiLCJlbWFpbCI6ImFkbWluQHNlZ3VyaWRhZC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc3Nzc4Nzk5MCwiZXhwIjoxNzc3Nzg4ODkwfQ.MIxKBThoDJOXro8mb7RDx7v4B0vNm03RDGM7dMcAf1s"
```

Resultado:

```bash
{
    "error":"Invalid request"
}
```

## Prueba 4: Crear tarea válida (Esperado: 201)

Comando ingresado:

```bash
curl -X POST http://localhost:3000/api/tareas -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWNiNWJiOGJjZmU4M2QxZWExNWVjMjUiLCJlbWFpbCI6ImFkbWluQHNlZ3VyaWRhZC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc3Nzc4Nzk5MCwiZXhwIjoxNzc3Nzg4ODkwfQ.MIxKBThoDJOXro8mb7RDx7v4B0vNm03RDGM7dMcAf1s" -H "Content-Type: application/json" -d "{\"title\": \"Mi tarea validada\"}"
```

Resultado:

```bash
{
    "title":"Mi tarea validada",
    "completed":false,
    "_id":"69f6e4ed1cdbe2c4a060600a",
    "createdAt":"2026-05-03T06:02:21.910Z",
    "__v":0
}
```
