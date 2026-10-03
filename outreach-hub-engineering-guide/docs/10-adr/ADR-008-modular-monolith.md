    # ADR-008: Modular Monolith, No Premature Microservices

    **Status:** Accepted

One repository and deployment owns the product.

Reasons:

- single user;
- modest data volume;
- shared domain rules across UI/API/MCP;
- zero-cost deployment target;
- simpler transactions and testing.

Split services only when there is a concrete independent scaling/security/deployment requirement. “MCP server” does not by itself require a separate service; it is a protocol endpoint in the same application.

