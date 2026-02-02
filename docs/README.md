# Documentation Index

This directory contains all project documentation organized by type and purpose.

## 📚 Reference Documentation

Core documentation that you'll frequently refer to during development.

### Domain & Business Logic

| Document | Purpose |
|----------|---------|
| [Domain Model](./reference/domain/DOMAIN_MODEL.md) | Entity definitions, attributes, invariants |
| [Business Rules](./reference/domain/BUSINESS_RULES.md) | Business rule catalog (searchable by ID) |

### Architecture & Technical

| Document | Purpose |
|----------|---------|
| [Architecture Overview](./reference/architecture/ARCHITECTURE_OVERVIEW.md) | System architecture and design patterns |
| [MQTT Contract](./reference/architecture/MQTT_CONTRACT.md) | MQTT topics, message schemas, error codes |
| [Enterprise Outbound MQTT](./reference/architecture/ENTERPRISE_OUTBOUND_MQTT.md) | Outbound module MQTT topics and protocols |

### Product & Requirements

| Document | Purpose |
|----------|---------|
| [PRD](./reference/product/PRD.md) | Product requirements, problem statement, users & roles |
| [Workflows](./reference/product/WORKFLOWS.md) | State machines, status transitions |
| [UI Pages](./reference/product/UI_PAGES.md) | Page routes and responsibilities |

### Standards & Guidelines

| Document | Purpose |
|----------|---------|
| [Definition of Done](./reference/standards/DEFINITION_OF_DONE.md) | Acceptance criteria and completion checklist |
| [Edge Cases](./reference/standards/EDGE_CASES.md) | Exception scenarios and handling playbook |

---

## 🔧 Development Notes

Project-specific documentation from development sessions. These are temporary references for ongoing work.

### Outbound Module

| Document | Purpose |
|----------|---------|
| [Outbound Upgrade Walkthrough](./development/outbound/OUTBOUND_UPGRADE_WALKTHROUGH.md) | Phase A & B implementation notes |
| [Outbound Phase A Walkthrough](./development/outbound/OUTBOUND_PHASE_A_WALKTHROUGH.md) | Phase A detailed notes |
| [Outbound Module Testing Guide](./development/outbound/OUTBOUND_MODULE_TESTING_GUIDE.md) | Testing procedures and scenarios |

### UI Development

| Document | Purpose |
|----------|---------|
| [Sidebar Restructure Plan](./development/ui/SIDEBAR_RESTRUCTURE_PLAN.md) | Sidebar navigation restructuring notes |

### General Development

| Document | Purpose |
|----------|---------|
| [Change Impact Guide](./development/CHANGE_IMPACT_GUIDE.md) | Impact analysis for system changes |

---

## Quick Start

**New to the project?** Start here:
1. [PRD](./reference/product/PRD.md) - Understand the problem and users
2. [Domain Model](./reference/domain/DOMAIN_MODEL.md) - Learn the entities
3. [Architecture Overview](./reference/architecture/ARCHITECTURE_OVERVIEW.md) - Understand the system design

**Adding a new feature?** Check:
1. [Business Rules](./reference/domain/BUSINESS_RULES.md) - Relevant rules
2. [Workflows](./reference/product/WORKFLOWS.md) - Status transitions
3. [Edge Cases](./reference/standards/EDGE_CASES.md) - Exception handling

**Working with MQTT?** See:
1. [MQTT Contract](./reference/architecture/MQTT_CONTRACT.md) - General protocol
2. [Enterprise Outbound MQTT](./reference/architecture/ENTERPRISE_OUTBOUND_MQTT.md) - Outbound-specific topics
