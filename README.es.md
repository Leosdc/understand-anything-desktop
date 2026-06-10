# Understand Anything Desktop

<p align="center">
  <img src="src/renderer/assets/mascote.png" width="160" alt="Mascote Understand Anything" />
</p>

[![GitHub](https://img.shields.io/badge/GitHub-Repo-181717?logo=github)](https://github.com/Leosdc/understand-anything-desktop)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](https://github.com/Leosdc/understand-anything-desktop/blob/main/LICENSE)
[![Original Creator](https://img.shields.io/badge/Creador_Original-Luminis-38bdf8)](https://lum.is-a.dev/)

Transforme cualquier base de código en un gráfico de conocimiento 3D interactivo para explorar visualmente, buscar y auditar. **¡Ahora con una hermosa aplicación de escritorio para Windows sin dependencias locales!**

Esta es la versión oficial de envoltura de escritorio y portátil del aclamado proyecto **Understand Anything**.

> [!IMPORTANT]
> **Créditos y Agradecimientos:** Esta aplicación de escritorio está construida sobre el excepcional pipeline de análisis de código creado por el desarrollador original, **Luminis** ([https://lum.is-a.dev/](https://lum.is-a.dev/) / [Repositorio de Understand-Anything](https://github.com/Egonex-AI/Understand-Anything)). Adaptamos los unificadores de gráficos de Python a TypeScript nativo y creamos un entorno seguro en Electron para hacer que esta poderosa herramienta sea accesible para todos sin dependencias de consola o interpretadores locales.

### 📊 Flujo de Trabajo y Datos

```mermaid
graph TD
    User([Interfaz de Usuario]) -->|1. Selecciona Proyecto y Modelo| Electron[Aplicación Electron]
    Electron -->|2. Escaneo Local Offline| Scan[Fase 1: Escaneo de Archivos]
    Scan -->|3. Agrupamiento de Archivos| Batches[Fase 1.5: División de Lotes Semánticos]
    Batches -->|4. Proyección Financiera| Confirm{Diálogo de Confirmación de Costo}
    Confirm -->|Abortar| Cancel[Limpieza y Restablecimiento]
    Confirm -->|Continuar| IA[Fase 2: Lectura del Código vía IA]
    IA -->|API de Gemini / Claude| LLM((Modelos de IA))
    IA -->|5. Unificación de Subgráficos| Merge[Fase 3-6: Normalización de Nodos y Enlaces]
    Merge -->|6. Guardar Gráfico Final| GraphFile[(knowledge-graph.json)]
    GraphFile -->|7. Servir vía HTTP Local| Express[Servidor Express + Token de uso único]
    Express -->|8. Renderización 3D Interactiva| Iframe[Iframe / Tablero Integrado]
```

---

## ✨ Características de Escritorio

- **📂 Selector de Proyectos Nativo**: Seleccione cualquier carpeta en su computadora utilizando diálogos nativos de Windows.
- **⚡ Proyectos Recientes Semánticos**: Cargue proyectos analizados previamente de forma instantánea. Si el gráfico ya existe, acceda al panel del visor en 1 segundo sin volver a ejecutar el análisis.
- **🛡️ Registros de Procesamiento en Tiempo Real**: Siga el progreso de las 7 fases del análisis (escaneo, procesamiento de lotes de IA, mapeo de capas y guías turísticos) en una consola interactiva.
- **🛑 Cancelación Real**: Detenga el análisis activo en cualquier momento. Los procesos en segundo plano y las solicitudes de IA se finalizan de inmediato para ahorrar tokens de API.
- **💰 Control de Costo Previo**: Estimación aproximada de tokens y costos en dólares ($) en la Fase 1.5, lo que le permite decidir si continuar o abortar la llamada de la IA.
- **🤖 Mascota Animada Flotante**: Asistente robótico visual integrado en las pantallas de configuración y progreso con reacciones al mouse.
- **💡 Ayuda Integrada**: Información sobre las fases, exclusiones en `.understandignore` y consejos de rendimiento directamente en la interfaz.
- **🔒 Servidor Web Local Seguro**: Servidor Express integrado protegido por tokens de acceso aleatorios de un solo uso generados en cada inicio.

---

## 🛠️ Instalación y Uso

Puede descargar la carpeta portátil precompilada directamente o compilar el proyecto usted mismo. ¡No se requieren dependencias de Python o compiladores de C++!

### Método 1: Ejecución de la Versión Portátil Precompilada (.exe)
1. Vaya al directorio [dist-package/Understand Anything-win32-x64](https://github.com/Leosdc/understand-anything-desktop/tree/main/dist-package/Understand%20Anything-win32-x64).
2. Haga doble clic en `Understand Anything.exe`.
3. Inserte su clave API de **Google Gemini** o **Anthropic Claude** (guardada localmente de forma segura).
4. Elija la carpeta de su proyecto y haga clic en **Analizar Repositorio**.

### Método 2: Compilación desde el Código Fuente
Si desea compilar la aplicación de escritorio localmente, asegúrese de tener Node.js instalado:

1. Clone el repositorio:
   ```bash
   git clone https://github.com/Leosdc/understand-anything-desktop.git
   cd understand-anything-desktop
   ```
2. Instale las dependencias:
   ```bash
   npm install
   ```
3. Compile el front-end, backend y empaquete la aplicación portátil:
   ```bash
   npm run build
   ```
   *(Este comando único genera el front-end de React, compila el backend en Node.js usando esbuild, copia los assets y genera el ejecutable portátil en `dist-package/`).*

---

## 🤝 Contribuciones

Si encuentra útil esta aplicación de escritorio portátil, considere:
- ⭐️ Dejar una estrella en el repositorio en [GitHub](https://github.com/Leosdc/understand-anything-desktop)
- 💡 Contribuir con mejoras de código o reportar fallos en el rastreador del repositorio.

*¡Agradecimiento especial a **Luminis** por crear el pipeline original que hace posible este proyecto!*
