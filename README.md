# Toskos FC

Aplicación web para registrar partidos y estadísticas.

## Tecnologías

- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **Handlebars** (vistas)
- **Socket.io** (actualizaciones en tiempo real)
- **CSS** custom con variables (dark theme)

## Funcionalidades

- Registrar partidos con resultado, jugadores, goles y asistencias
- Editar y eliminar partidos
- Filtrar partidos y estadísticas por temporada
- Tabla de estadísticas con ranking
- Soporte para jugadores invitados
- Actualizaciones en tiempo real entre pestañas vía Socket.io

## Instalación

```bash
# Clonar repositorio
git clone https://github.com/facumarcati/toskos-fc.git
cd toskos-fc

# Instalar dependencias
npm install

# Iniciar servidor
npm run dev
```

## Estructura

```
src/
├── config/
│   └── db.js
├── models/
│   ├── match.model.js
│   └── player.model.js
├── public/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── newMatch.js
│       ├── deleteModal.js
│       ├── realTime.js
│       └── stats.js
├── routes/
│   ├── matches.route.js
│   └── stats.route.js
├── views/
│   ├── layouts/
│   │   └── main.handlebars
│   ├── editMatch.handlebars
│   ├── home.handlebars
│   ├── matches.handlebars
│   ├── newMatch.handlebars
│   └── stats.handlebars
└── app.js
```

## Scripts

```bash
npm run dev    # Desarrollo con nodemon
npm start      # Producción
```
