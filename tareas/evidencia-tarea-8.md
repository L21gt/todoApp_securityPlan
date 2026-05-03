Login
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@seguridad.com\",\"password\":\"SuperSecreta123!\"}"

Prueba 1: Crear tarea sin título (Esperado: 422)

Prueba 2: Crear tarea con título vacío (Esperado: 422)

Prueba 3: ID inválido (Esperado: 400 sin stack trace)

Prueba 4: Crear tarea válida (Esperado: 201)
