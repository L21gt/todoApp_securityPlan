# 1. Crear un proyecto con descripción

POST /api/orgs/:id/projects
{ "name": "Confidencial", "description": "Plan estratégico Q3" }

```bash
curl -X POST http://localhost:3000/api/projectsization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWNiNWJiOGJjZmU4M2QxZWExNWVjMjUiLCJlbWFpbCI6ImFkbWluQHNlZ3VyaWRhZC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc4MjI2OTM2xNzgyMjcwMjY2fQ._uKoFzdMSNhwNTaBku1LfD_naDVSk_CZQYImo2Ci3-A" -H "Content-Type: application/json" -d "{\"name\": \"Proyecto Ultrasecreto\", \"description\": \"Esta es la descripcion l del proyecto\"}"
```

Resultado en consola:

```bash
{"_id":"6a3b48a4af811c6073244c18","name":"Proyecto Ultrasecreto","description":"Esta es la descripcion confidencial del proyecto","createdAt":"2026-06-24T03:01:56.617Z","__v":0,"id"6a3b48a4af811c6073244c18"}
```

Captura:
![Creación de Proyecto](../capturas_Tarea12/creacion_proyecto.PNG)

# 2. Ver el documento en MongoDB Compass

Captura:
![Proyecto cifrado en Base de Datos](../capturas_Tarea12/proyecto_cifrado_base_de_datos.PNG)

# 3. Leerlo por la API

```bash
curl -X GET http://localhost:3000/api/projects/6a3b48a4af811c6073244c18 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWNiNWJiOGJjZmU4M2QxZWExNWVjMjUiLCJlbWFpbCI6ImFkbWluQHNlZ3VyaWRhZC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc4MjI3Mjg4OSwiZXhwIjoxNzgyMjczNzg5fQ.UEW_CB9B-0XsOVXDF4MZDM_iKo_v67AA1wfnDajrlZw"
```

Resultado en consola:

```JSON
    {
        "_id":"6a3b48a4af811c6073244c18",
        "name":"Proyecto Ultrasecreto",
        "description":"Esta es la descripcion confidencial del proyecto",
        "createdAt":"2026-06-24T03:01:56.617Z",
        "__v":0,
        "id":"6a3b48a4af811c6073244c18"
    }
```

Captura:
![Lectura texto plano API](../capturas_Tarea12/lectura_texto_plano_API.PNG)

# 4. Crear una tarea sensitive

```bash
curl -X POST http://localhost:3000/api/tareas/project/6a3b5a0181816380e3b04422 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWNiNWJiOGJjZmU4M2QxZWExNWVjMjUiLCJlbWFpbCI6ImFkbWluQHNlZ3VyaWRhZC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc4MjI3NTQ2MCwiZXhwIjoxNzgyMjc2MzYwfQ.Pf_tl-VtfxhtHjRdW0Lw0dWoOdQIirFPhpf7NMiH4pA" -H "Content-Type: application/json" -d "{\"title\": \"Diseño\", \"sensitive\": true, \"description\": \"Salario Pedro 8000\", \"userId\": \"69cb5bb8bcfe83d1ea15ec25\", \"projectId\": \"6a3b5a0181816380e3b04422\"}"
```

Resultado en consola:

```JSON
    {
        "title":"Diseño",
        "description":"Salario Pedro 8000",
        "sensitive":true,
        "completed":false,
        "projectId":"6a3b5a0181816380e3b04422",
        "userId":"69cb5bb8bcfe83d1ea15ec25",
        "_id":"6a3b5e84d8440ae044d0e417",
        "createdAt":"2026-06-24T04:35:16.461Z",
        "__v":0,
        "id":"6a3b5e84d8440ae044d0e417"
    }
```

Captura:
![Crear Tarea Sensitive](../capturas_Tarea12/crear_tarea_sensitive.PNG)
![Tarea Sensitive Cifrada en Base de Datos](../capturas_Tarea12/tarea_sensitive_cifrada_base_de_datos.PNG)

# 5. Tarea NO sensitive: se guarda en plano

```bash
curl -X POST http://localhost:3000/api/tareas/project/6a3b5a0181816380e3b04422 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWNiNWJiOGJjZmU4M2QxZWExNWVjMjUiLCJlbWFpbCI6ImFkbWluQHNlZ3VyaWRhZC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc4MjI3NTk4MywiZXhwIjoxNzgyMjc2ODgzfQ.H0m5srlO9kXJcNFYQBltVMTvqEFV5Ztydtx9rHhI7uo" -H "Content-Type: application/json" -d "{\"title\": \"Diseño\", \"sensitive\": false, \"description\": \"Salario Pedro 8000\", \"userId\": \"69cb5bb8bcfe83d1ea15ec25\", \"projectId\": \"6a3b5a0181816380e3b04422\"}"
```

Resultado en consola:

```JSON
{
    "title":"Diseño",
    "description":"Salario Pedro 8000",
    "sensitive":false,
    "completed":false,
    "projectId":"6a3b5a0181816380e3b04422",
    "userId":"69cb5bb8bcfe83d1ea15ec25",
    "_id":"6a3b5fb3d8440ae044d0e41f",
    "createdAt":"2026-06-24T04:40:19.293Z",
    "__v":0,
    "id":"6a3b5fb3d8440ae044d0e41f"
}
```

Captura:
![Crear Tarea No Sensitive](../capturas_Tarea12/crear_tarea_no_sensitive.PNG)
![Tarea No Sensitive en Plano en Base de Datos](../capturas_Tarea12/tarea_no_sensitive_en_plano_base_de_datos.PNG)
