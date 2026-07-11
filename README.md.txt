# Plataforma de Gestión Financiera y Control de Alquileres (Rosario, Argentina)

Este documento sirve como especificación técnica completa, estructura de archivos y guía de desarrollo para la plataforma de control de ingresos, gastos, ahorros y gestión de propiedades en alquiler. Está estructurado para ser interpretado directamente por **antigravity cli** o utilizado como el archivo `README.md` principal del proyecto para su posterior despliegue automatizado en **Vercel**.

---

## 1. Visión General del Proyecto

La aplicación es una plataforma web modular diseñada para resolver dos necesidades críticas de forma unificada:
1.  **Finanzas Personales:** Registro exhaustivo de ingresos, ahorros y gastos del hogar, parametrizados para la realidad fiscal y de servicios de la ciudad de Rosario, Santa Fe, Argentina.
2.  **Gestión Inmobiliaria:** Administración de contratos de locación para dos tipos de activos: **Departamentos** y **Locales Comerciales (Negocios)**, incluyendo el cálculo automatizado de rentabilidad, alertas de vencimiento e índices de actualización.
3.  **Motor de Métricas Avanzado:** Panel analítico capaz de calcular variaciones relativas e interpersonales en ventanas temporales configurables: Mensual (MoM), Trimestral (QoQ), Semestral (HoH) y Anual (YoY).

---

## 2. Stack Tecnológico Recomendado para Vercel

Para asegurar un despliegue sin fricciones en Vercel y un rendimiento óptimo, la estructura está diseñada bajo el siguiente stack:
* **Framework:** Next.js (App Router) con TypeScript para un tipado estricto de los contratos de alquiler y transacciones financieras.
* **Estilos:** Tailwind CSS (diseño limpio, responsivo y adaptado a paneles de control).
* **Base de Datos / ORM:** Prisma ORM con PostgreSQL (compatible con esquemas serverless como Supabase, Neon o Vercel Postgres).
* **Gestión de Estado y Consultas:** React Hook Form (formularios optimizados) y TanStack Query (Zustand opcional para el estado global del filtro temporal).

---

## 3. Arquitectura del Proyecto y Estructura de Directorios

Esta es la estructura exacta que **antigravity cli** creará o leerá para inicializar el entorno de desarrollo:

```text
finanzas-alquileres-rosario/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── prisma/
│   ├── schema.prisma          # Definición de base de datos relacional
│   └── seed.ts                # Semilla de categorías fiscales de Rosario
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # Layout principal con Navbar y Providers
│   │   ├── page.tsx           # Dashboard / Panel General
│   │   ├── finanzas/
│   │   │   ├── page.tsx       # UI de Ingresos, Gastos y Ahorros
│   │   │   └── loading.tsx
│   │   ├── propiedades/
│   │   │   ├── page.tsx       # Gestión de Departamentos y Locales
│   │   │   └── [id]/page.tsx  # Detalle del contrato y cobros
│   │   ├── metricas/
│   │   │   └── page.tsx       # Motor de variaciones y gráficos estadísticos
│   │   └── api/               # Endpoints Backend Serverless
│   │       ├── transacciones/route.tsx
│   │       ├── propiedades/route.tsx
│   │       └── analytics/route.tsx
│   ├── components/            # Componentes reutilizables de UI
│   │   ├── ui/                # Botones, inputs, modales básicos
│   │   ├── dashboard/
│   │   │   ├── MetricCard.tsx
│   │   │   └── OverviewChart.tsx
│   │   ├── finanzas/
│   │   │   ├── TransactionForm.tsx
│   │   │   └── LocalTaxPanel.tsx # Panel específico para impuestos de Rosario
│   │   └── propiedades/
│   │       ├── PropertyCard.tsx
│   │       └── ContractUpdateModal.tsx
│   ├── hooks/                 # Lógica compartida y Fetching
│   │   ├── useAnalytics.ts    # Hook para procesar variaciones temporales
│   │   └── useTransactions.ts
│   ├── lib/                   # Configuraciones de clientes (Prisma, fechas)
│   │   ├── prisma.ts
│   │   └── utils.ts           # Calculadoras de variación porcentual
│   └── types/                 # Interfaces de TypeScript
│       └── index.ts
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json