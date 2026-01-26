# Henkel WMS v2

Warehouse Management System built with React, Vite, and Domain-Driven Design (DDD) principles.

## Architecture

This application follows **Domain-Driven Design (DDD)** principles with a **capability-based module organization**.

### Module Structure

Modules are organized by **business capabilities** (bounded contexts), not by entity attributes:

```
src/modules/
├── inbound/        # Inbound operations (receiving, ASN, putaway)
├── outbound/       # Outbound operations (DN, dispatch, shipping)
├── production/     # Manufacturing operations
├── master/         # Master data (materials, locations, warehouses, partners)
├── finance/        # Financial operations (costing, billing, reconciliation)
├── quality/        # Quality control and inspection
├── inventory/      # Inventory management
├── integration/    # External system integration (3PL sync)
├── governance/     # Audit logs, traceability, compliance
├── dashboard/      # Dashboard views
└── reports/        # Reporting and analytics
```

### Key Principles

- **Capability-Based Organization**: Modules represent business capabilities, not entity attributes
- **Domain Layer Separation**: Business logic lives in `src/domain/`, UI logic in `src/modules/`
- **Warehouse Type Agnostic**: Domain services handle both internal and external warehouses
- **Filter in UI**: Warehouse type filtering happens in the presentation layer, not architectural boundaries

### Documentation

For detailed architecture guidance, see:
- **Module Architecture Skill**: `.cursor/skills/module-architecture/SKILL.md` - Complete guide on module organization
- **Decision Tree**: `.cursor/skills/module-architecture/references/MODULE_DECISION_TREE.md` - Quick reference for where pages go
- **DDD Patterns**: `.cursor/skills/ddd-frontend-refactor/SKILL.md` - Domain layer patterns (validators, services)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Technology Stack

- **React** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **MQTT** - Real-time communication (Unified Namespace pattern)

## Project Structure

```
src/
├── components/     # Shared UI components
├── context/        # React context providers (Auth, UNS)
├── domain/         # Domain layer (validators, services)
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
├── modules/        # Feature modules (capability-based)
└── pages/          # Global pages (search, etc.)
```

## Contributing

When adding new pages or features:

1. **Identify the business capability** - What business process does this support?
2. **Place in the correct module** - Use the module-architecture skill to determine location
3. **Follow DDD patterns** - Extract business logic to domain layer
4. **Keep domain services type-agnostic** - Filter by warehouse type in UI, not in domain

See `.cursor/skills/module-architecture/SKILL.md` for detailed guidance.
