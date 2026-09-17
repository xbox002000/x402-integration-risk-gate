# Required mitigations (from gate)

- Pin a tagged release, review privileged paths, and require an audit trail before production use.

Risks:
- [high] privileged_integration_intent: Buyer intent mentions privileged/mutable control surfaces — high blast radius if mis-integrated.
- [med] mutable_or_upgradeable_surface: README/topics suggest upgradeability or privileged admin paths.
