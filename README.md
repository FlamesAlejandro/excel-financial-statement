# Excel Financial Statement

Aplicación local-first para gestionar estado financiero mensual: ingresos, gastos, gastos fijos, cuotas y métodos de pago, con importación y exportación en Excel.

## Características

- Gestión mensual de sueldo base e ingresos adicionales.
- Registro de gastos normales y gastos en cuotas.
- Gestión de gastos fijos con vigencia (inicio y término opcional).
- Gestión de métodos de pago (con o sin cargo mensual).
- Dashboard con resumen mensual y dinero restante.
- Exportación a Excel con hojas de resumen, meses y configuración.
- Importación desde Excel con validaciones y compatibilidad por nombre de hoja.
- Flujo local-first, sin backend.

## Stack técnico

- React 19 + TypeScript + Vite
- Zustand para estado global
- React Hook Form + Zod para formularios y validación
- SheetJS (xlsx) para import/export Excel
- Vitest para testing
- ESLint para calidad de código

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

```bash
npm install
```

## Scripts disponibles

```bash
# Desarrollo
npm run dev

# Tests
npm run test

# Lint
npm run lint

# Build producción
npm run build

# Previsualizar build
npm run preview
```

## Flujo de uso

1. Crea o carga tu workbook financiero.
2. Configura métodos de pago y gastos fijos.
3. Registra movimientos del mes (ingresos, gastos, cuotas).
4. Revisa resumen y disponible en dashboard.
5. Exporta a Excel para respaldo o análisis.

## Estructura del proyecto

```text
src/
  app/                # Estructura principal de la UI
  components/         # Componentes reutilizables
  domain/finance/     # Tipos, cálculos y factories del dominio
  features/           # Módulos funcionales (salary, expenses, installments, etc.)
  infrastructure/excel/ # Importación/exportación Excel
  store/              # Estado global (Zustand)
```

## Estado actual

- Tests y build configurados y funcionando.
- Lógica de negocio orientada a control mensual y exportación robusta.
- Importación basada en nombres de hoja, no en orden, para mayor compatibilidad.

## Licencia

Uso privado/proyecto personal.
