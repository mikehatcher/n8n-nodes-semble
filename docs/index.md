# n8n Semble Integration

Welcome to the official documentation for the **n8n Semble community node v2.0** - your gateway to automating healthcare practice management workflows with enterprise-grade reliability.

## 🚀 What is n8n Semble v2.0?

The n8n Semble node is a completely rewritten, enterprise-ready integration that connects [n8n workflow automation](https://n8n.io) with [Semble practice management system](https://semble.io). Version 2.0 features a complete architectural overhaul with service-oriented design, comprehensive testing, and professional documentation.

## ✨ Key Features

- **📅 Booking Management** - Complete CRUD operations for appointment scheduling and management
- **👥 Patient Operations** - Full patient lifecycle management with advanced validation
- **🛍️ Product & Service Catalogue** - Comprehensive inventory and service management
- **🔄 Real-time Triggers** - Intelligent monitoring with configurable polling intervals
- **🛡️ Enterprise-grade Security** - Advanced error handling, field permissions, and environment controls
- **⚡ High Performance** - Intelligent caching, service container, and optimised queries
- **🧪 Quality Assurance** - 86.31% test coverage with 1,312+ automated tests

## 🏗️ Architecture

Built with modern TypeScript and enterprise-grade patterns:

- **Service-oriented Architecture** - Modular design with dependency injection via ServiceContainer
- **Event-driven System** - Comprehensive event system for monitoring and debugging
- **Type-safe Operations** - Full TypeScript interfaces with runtime validation
- **Intelligent Caching** - High-performance caching with configurable TTL and service integration
- **Advanced Error Handling** - Sophisticated error mapping and field permission processing
- **Schema Registry** - Dynamic schema management and validation system

## 🆕 What's New in v2.0

!!! success "Complete Rewrite"
    Version 2.0 is a complete architectural rewrite with significant breaking changes and improvements.

### Major Enhancements
- **Service-oriented Architecture** - Complete refactor with dependency injection and service container
- **Resource Changes** - `appointment` → `booking`, removed `staff`, added comprehensive `products` support
- **Enhanced Testing** - 86.31% test coverage with 1,312+ automated tests and quality gates
- **Professional Documentation** - Complete MkDocs documentation with examples and API reference
- **Advanced Error Handling** - Sophisticated error mapping and validation system
- **Performance Optimisations** - Intelligent caching, schema registry, and query optimisation

### Breaking Changes
- Resource name changed from `appointment` to `booking`
- `staff` resource removed (read-only operations were limited in scope)
- Enhanced credential configuration with environment validation
- API response format improvements for better data consistency

## 📚 Documentation Structure

<div class="grid cards" markdown>

-   :material-rocket-launch:{ .lg .middle } **Getting Started**

    ---

    Quick setup guide to get you up and running in minutes

    [:octicons-arrow-right-24: Installation Guide](getting-started/installation.md)

-   :material-api:{ .lg .middle } **Node Reference**

    ---

    Comprehensive documentation for all available nodes and operations

    [:octicons-arrow-right-24: Node Documentation](nodes/overview.md)

-   :material-code-braces:{ .lg .middle } **API Reference**

    ---

    Auto-generated documentation from TypeScript code

    [:octicons-arrow-right-24: API Docs](api/README.md)

-   :material-lightbulb:{ .lg .middle } **Examples**

    ---

    Real-world workflows and integration patterns

    [:octicons-arrow-right-24: Browse Examples](examples/common-workflows.md)

</div>

## 🤝 Community & Support

- **GitHub Repository**: [mikehatcher/n8n-nodes-semble](https://github.com/mikehatcher/n8n-nodes-semble)
- **Issues & Bug Reports**: [GitHub Issues](https://github.com/mikehatcher/n8n-nodes-semble/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/mikehatcher/n8n-nodes-semble/discussions)
- **n8n Community**: [n8n Community Forum](https://community.n8n.io/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/mikehatcher/n8n-nodes-semble/blob/main/LICENSE) file for details.

---

**Ready to get started?** Head over to the [Installation Guide](getting-started/installation.md) to begin automating your practice management workflows! 🎉
