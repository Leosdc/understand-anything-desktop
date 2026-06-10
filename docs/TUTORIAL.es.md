# Understand Anything Desktop - Manual Completo de Usuario

Bienvenido a la guía oficial de usuario de **Understand Anything Desktop**. Esta guía cubre cada característica, paso de configuración, técnicas de control de costos de tokens y herramientas de interfaz para ayudarle a obtener el máximo provecho de su análisis de código sin gastos inesperados.

---

## 🚀 Primeros Pasos y Configuración de API Key

Understand Anything utiliza Modelos de Lenguaje de Gran Escala (LLMs) para leer, clasificar y describir la lógica de su código. Para utilizar la aplicación, necesitará una clave API (API Key) personal de Google Gemini o de Anthropic Claude:

1. **Obtener una API Key**:
   - **Google Gemini**: Acceda a [Google AI Studio](https://aistudio.google.com/) y genere una clave de API. (Gemini 2.5 Flash es altamente recomendado por su velocidad y economía).
   - **Anthropic Claude**: Acceda a [Anthropic Console](https://console.anthropic.com/) para crear su clave y comprar créditos de API.
2. **Configurar la Aplicación**:
   - Pegue la clave en el campo **API Key**.
   - Elija el proveedor correspondiente (**Google Gemini AI** o **Anthropic Claude**).
   - Seleccione el modelo deseado. Los modelos de la línea *Flash* (como `gemini-2.5-flash` o `claude-3-5-haiku`) son ideales para análisis generales y son extremadamente baratos. Los modelos *Pro/Sonnet* ofrecen razonamiento más profundo, pero consumen más tokens de su saldo de API.

---

## ⚠️ Control de Costos con `.understandignore` (Crítico)

Debido a que la Fase 2 lee el contenido textual real de los archivos de su repositorio utilizando la inteligencia artificial, analizar carpetas pesadas, librerías de terceros o archivos binarios compilados puede consumir sus créditos de API de forma extremadamente rápida. **Para evitar costos elevados, es obligatorio configurar las reglas de ignore.**

### ¿Qué es el archivo de ignore?
El `.understandignore` es un archivo de texto simple ubicado en el directorio:
`[carpeta-raiz-de-su-proyecto]/.understand-anything/.understandignore`

Cualquier archivo o directorio que coincida con los patrones descritos en este archivo se omitirá por completo durante el escaneo y **no** se enviará para lectura de la IA.

### Exclusiones Recomendadas
Siempre excluya archivos no esenciales, dependencias externas, carpetas de compilación y archivos de medios:

| Categoría | Patrones de Ejemplo | Motivo |
|---|---|---|
| **Gestores de Paquetes** | `node_modules/`, `.venv/`, `venv/`, `__pycache__/`, `bower_components/` | Contiene miles de archivos de librerías externas. **Nunca analice estas carpetas.** |
| **Carpetas de Salida** | `dist/`, `build/`, `out/`, `target/`, `bin/`, `obj/` | Códigos compilados o empaquetados duplican la lógica original del código, duplicando el consumo de tokens. |
| **Control de Versiones** | `.git/`, `.github/`, `.svn/`, `.hg/` | Directorios internos de metadados con historial masivo de commits. |
| **Archivos de Lock** | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `cargo.lock` | Archivos de texto gigantescos con miles de rutas de dependencias que desperdician créditos. |
| **Medios y Binarios** | `*.png`, `*.jpg`, `*.mp4`, `*.zip`, `*.pdf`, `*.mov` | No contienen código fuente legible y desperdician límite de tokens de contexto. |
| **Pruebas/Cobertura** | `coverage/`, `.nyc_output/` | Reportes y logs temporales de herramientas de prueba. |

### Cómo dar formato a las reglas
Escriba cada patrón en una línea separada. Admite la coincidencia glob estándar:
- `/node_modules` o `node_modules/` ignora toda la carpeta.
- `*.log` ignora todos los archivos de registro.
- `temp/*` ignora todo el contenido dentro de la carpeta temporal.

---

## 🔄 Uso del Editor de Exclusiones y Recálculo en Tiempo Real

Para facilitar el control de costos, la aplicación desktop incluye un editor de `.understandignore` integrado directamente en el modal de confirmación de costos.

> [!TIP]
> **Cómo optimizar su presupuesto de análisis sobre la marcha:**
> 1. Seleccione la carpeta del proyecto y haga clic en **Analisar Repositório**.
> 2. La aplicación realizará un escaneo local rápido y mostrará el modal **Confirmar Estimación de Costo**.
> 3. Observe el **Costo Estimado de la API de IA**. Si es demasiado alto:
>    - Vaya a la sección **Reglas de Exclusión (.understandignore)** en el lado derecho del modal.
>    - Agregue las carpetas que desea remover del análisis (ej: `node_modules/` o `dist/`).
>    - Haga clic en el botón **Guardar y Recalcular**.
> 4. La aplicación guardará los cambios en el archivo físicamente, cancelará la ejecución actual en segundo plano e iniciará un nuevo escaneo limpio.
> 5. En pocos segundos, ¡aparecerá un nuevo resumen con conteo reducido de archivos y tokens actualizado!
> 6. Si el valor es adecuado para su presupuesto, haga clic en **Confirmar y Continuar** para proceder a la análisis con IA.

---

## 📊 Comprensión del Pipeline de Análisis de 7 Fases

Conozca lo que hace la aplicación en cada etapa:

1. **Fase 0: Pre-flight**: Preparación de directorios y validación inicial del entorno de ejecución.
2. **Fase 0.5: Configurando Exclusiones**: Crea el archivo `.understandignore` con patrones predeterminados si no existe.
3. **Fase 1: Varredura do Projeto**: Mapea todos los archivos, tamaños, lenguajes y dependencias locales de forma offline.
4. **Fase 1.5: División de Lotes**: Agrupa archivos relacionados lógicamente en lotes semánticos (batches) para su envío.
5. **Confirmación de Costo**: *Interacción del usuario.* Muestra la proyección de tokens, archivos y costos estimados en dólares ($).
6. **Fase 2: Lectura de Código (IA)**: Procesamiento secuencial en el que la IA lee cada lote, escribe resúmenes y detecta dependencias ocultas.
7. **Fase 3 a 6: Unificación y Enlaces**: Normaliza identificadores, vincula archivos de pruebas a archivos de producción correspondientes y resuelve enlaces.
8. **Fase 7: Servidor y Dashboard**: Inicializa un servidor Express local seguro para representar el panel interactivo 3D.

---

## 🎮 Interacción con el Gráfico de Conocimiento 3D

Una vez finalizado el análisis, el panel carga un espacio interactivo tridimensional:

- **Navegación**:
  - **Botón Izquierdo del Ratón + Arrastrar**: Rota el espacio 3D.
  - **Botón Derecho del Ratón + Arrastrar (o Shift + Arrastrar)**: Desplaza la cámara (Pan).
  - **Rueda del Ratón**: Acerca y aleja el zoom.
- **Clasificación de Nodos**:
  - Cada nodo representa un artefacto de código (archivo, función, clase, ruta/endpoint).
  - Pasar el cursor sobre un nodo muestra su ruta física, lenguaje, resumen semántico y nivel de complejidad.
- **Complejidad de Código**:
  - **Verde (Simple)**: Pocas líneas de código, lógica directa.
  - **Amarillo (Moderate)**: Lógica con complejidad y dependencias intermedias.
  - **Rojo (Complex)**: Gran acoplamiento o lógica compleja. ¡Excelente candidato para refactorización!
- **Proyectos Recientes**:
  - El historial en la pantalla de configuración permite cargar los últimos 5 proyectos analizados. Si el gráfico existe, el panel se abre en 1 segundo sin generar llamadas adicionales de IA.
