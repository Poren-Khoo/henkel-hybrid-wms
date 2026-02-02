# Henkel WMS v2

Enterprise Warehouse Management System built with React, Vite, and Domain-Driven Design (DDD) principles.

## Documentation

Comprehensive documentation is available in the `docs/` folder. See [docs/README.md](docs/README.md) for the complete index.

### Quick Reference

| Document | Purpose |
|----------|---------|
| [PRD](docs/reference/product/PRD.md) | Product requirements, problem statement, users & roles |
| [Domain Model](docs/reference/domain/DOMAIN_MODEL.md) | Entity definitions, attributes, invariants |
| [Workflows](docs/reference/product/WORKFLOWS.md) | State machines, status transitions |
| [MQTT Contract](docs/reference/architecture/MQTT_CONTRACT.md) | MQTT topics, message schemas, error codes |
| [Business Rules](docs/reference/domain/BUSINESS_RULES.md) | Business rule catalog (searchable by ID) |
| [Edge Cases](docs/reference/standards/EDGE_CASES.md) | Exception scenarios and handling playbook |
| [UI Pages](docs/reference/product/UI_PAGES.md) | Page routes and responsibilities |

**📚 [View Full Documentation Index →](docs/README.md)**

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

### Domain Layer

Business logic is separated into the `src/domain/` layer:

```
src/domain/
├── outbound/
│   ├── OutboundOrderValidator.js   # Validation rules
│   └── OutboundOrderService.js     # Business operations
├── inbound/
│   ├── InboundOrderValidator.js
│   ├── InboundOrderService.js
│   ├── PutawayTaskValidator.js
│   ├── PutawayTaskService.js
│   ├── ExceptionValidator.js
│   └── ExceptionService.js
├── material/
├── location/
├── warehouse/
├── partner/
└── worker/
```

### Key Principles

- **Capability-Based Organization**: Modules represent business capabilities, not entity attributes
- **Domain Layer Separation**: Business logic lives in `src/domain/`, UI logic in `src/modules/`
- **Warehouse Type Agnostic**: Domain services handle both internal and external warehouses
- **Filter in UI**: Warehouse type filtering happens in the presentation layer, not architectural boundaries

## Cursor Skills

AI development guidance is available in `.cursor/skills/`:

| Skill | Purpose |
|-------|---------|
| [wms-domain](/.cursor/skills/wms-domain/SKILL.md) | Domain knowledge - entities, rules, workflows |
| [mqtt-uns-patterns](/.cursor/skills/mqtt-uns-patterns/SKILL.md) | MQTT/UNS communication patterns |
| [ddd-frontend-refactor](/.cursor/skills/ddd-frontend-refactor/SKILL.md) | Domain layer patterns (validators, services) |
| [module-architecture](/.cursor/skills/module-architecture/SKILL.md) | Module organization guide |
| [master-data-pattern](/.cursor/skills/master-data-pattern/SKILL.md) | Master data handling patterns |

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

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React (JavaScript), Vite, shadcn/ui, Tailwind | Single-page application |
| Backend | Node-RED | Flow-based programming for IoT |
| Communication | MQTT | Real-time pub/sub (Unified Namespace) |
| Broker | Tier0 Platform | UNS pattern |

### MQTT Architecture

This system uses MQTT instead of REST APIs:
- **State topics** - Subscribe for real-time data
- **Action/Command topics** - Publish to execute operations
- **No built-in error codes** - Custom error handling required

See [docs/reference/architecture/MQTT_CONTRACT.md](docs/reference/architecture/MQTT_CONTRACT.md) for complete protocol specification.

## Project Structure

```
henkel-wms-v2/
├── docs/               # Documentation (PRD, domain model, workflows, etc.)
├── src/
│   ├── components/     # Shared UI components
│   ├── context/        # React context providers (Auth, UNS)
│   ├── domain/         # Domain layer (validators, services)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   ├── modules/        # Feature modules (capability-based)
│   └── pages/          # Global pages (search, etc.)
├── .cursor/
│   ├── plans/          # Cursor agent plans
│   └── skills/         # AI development guidance
└── public/             # Static assets
```

## Contributing

When adding new pages or features:

1. **Read the documentation** - Start with [docs/reference/product/PRD.md](docs/reference/product/PRD.md) and [docs/reference/domain/DOMAIN_MODEL.md](docs/reference/domain/DOMAIN_MODEL.md)
2. **Identify the business capability** - What business process does this support?
3. **Place in the correct module** - Use the module-architecture skill to determine location
4. **Follow DDD patterns** - Use validators and services from `src/domain/`
5. **Check business rules** - Reference [docs/reference/domain/BUSINESS_RULES.md](docs/reference/domain/BUSINESS_RULES.md)
6. **Handle edge cases** - Check [docs/reference/standards/EDGE_CASES.md](docs/reference/standards/EDGE_CASES.md) for exception scenarios

### Code Review Checklist

When reviewing code, verify:

- [ ] Uses domain Validator for validation (not inline logic)
- [ ] Uses domain Service for MQTT payloads (not manual construction)
- [ ] Status transitions match [docs/reference/product/WORKFLOWS.md](docs/reference/product/WORKFLOWS.md)
- [ ] MQTT topics match [docs/reference/architecture/MQTT_CONTRACT.md](docs/reference/architecture/MQTT_CONTRACT.md)
- [ ] Loading, error, and empty states handled
- [ ] Relevant edge cases addressed

See [.cursor/skills/wms-domain/SKILL.md](/.cursor/skills/wms-domain/SKILL.md) for detailed guidance.
