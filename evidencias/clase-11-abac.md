# Evidencia - Tarea 11 ABAC

## Política implementada

Mi política ABAC implementa el control de acceso evaluando el rol del usuario (`project_admin`, `developer`, `viewer`) dentro de la colección `Membership` asociada al `projectId`. Además, para la edición de tareas, se evalúa dinámicamente si el `userId` del creador de la tarea coincide con el `userId` de quien hace la petición.

## Curl 1: viewer lee tarea → 200

```bash
curl -X GET http://localhost:3000/api/tareas/project/6a13d0dbec57b6f3c0d10fee -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTEzZDBkOGVjNTdiNmYzYzBkMTBmZTciLCJpYXQiOjE3Nzk2ODM1NTEsImV4cCI6MTc3OTY4NzE1MX0.3E_w8EBQt429dMt78Ys4jDDwRyFEoyC97IcurLhzO1k"
```

```json
[
  {
    "_id": "6a13d0dfec57b6f3c0d10ff6",
    "title": "Tarea de Dev2",
    "completed": false,
    "projectId": "6a13d0dbec57b6f3c0d10fee",
    "userId": "6a13d0dbec57b6f3c0d10fec",
    "createdAt": "2026-05-25T04:32:31.192Z",
    "__v": 0
  }
]
```

## Curl 2: viewer intenta crear → 403

```bash
curl -X POST http://localhost:3000/api/tareas/project/6a13d0dbec57b6f3c0d10fee -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTEzZDBkOGVjNTdiNmYzYzBkMTBmZTciLCJpYXQiOjE3Nzk2ODM1NTEsImV4cCI6MTc3OTY4NzE1MX0.3E_w8EBQt429dMt78Ys4jDDwRyFEoyC97IcurLhzO1k" -H "Content-Type: application/json" -d "{\"title\": \"Hacking\"}"
```

```json
{
  "error": "Forbidden: No tienes permisos para crear tareas"
}
```

## Curl 3: developer edita tarea ajena → 403

```bash
curl -X PUT http://localhost:3000/api/tareas/6a13d0dfec57b6f3c0d10ff6 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTEzZDBkYWVjNTdiNmYzYzBkMTBmZWEiLCJpYXQiOjE3Nzk2ODM1NTEsImV4cCI6MTc3OTY4NzE1MX0.XePJ_jrLDABFfE9OZk7lIcdouFKrdHNZR4BJV487lAo" -H "Content-Type: application/json" -d "{\"title\": \"Hack\"}"
```

```json
{
  "error": "Forbidden: No tienes permisos para editar esta tarea"
}
```
