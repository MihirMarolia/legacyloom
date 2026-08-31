# Legacyloom product notes

Legacyloom is scoped to Ontario and is intended to be a nonprofit digital planning service. The interface is designed to make essential planning more understandable and accessible through free or pay-what-you-can access.

The service must consistently state that it is software, not legal advice, and not a law firm. The suitability screener is an intake safeguard rather than a legal conclusion. Situations involving urgency, disputes, unusual assets, capacity concerns, coercion, cross-border issues, or other complexity should be routed to qualified Ontario legal professionals.

The current product foundation includes the public landing experience, authenticated dashboard shell, Ontario suitability screener, will and prenuptial planning paths, local saved-progress behavior for non-sensitive planner state, a database model for plans, document versions, reminder consent, professional review requests, and donation references, plus a document-vault interface.

Before production use, the nonprofit needs qualified Ontario legal review of all templates, educational content, eligibility rules, signing and witnessing instructions, prenup disclosure guidance, independent-legal-advice checkpoints, privacy policy, consent language, retention policy, accessibility content, and professional-review operating procedures. Document generation and secure vault storage must be connected to authenticated server-side persistence and object storage before users can rely on those functions.

Reminder delivery must remain opt-in. Donation checkout must use the configured payment provider without storing card data locally. Impact metrics must be aggregated and anonymized so individual legal-planning activity is not exposed.


## Responsive verification

The landing page, dashboard, and vault were reviewed at 375×812 in addition to desktop. The mobile layouts preserve the typographic hierarchy, collapse navigation into a menu, stack document controls, keep primary actions full-width, and retain the red/black contrast system. No blocking overflow or unreadable control was observed in the reviewed viewport. The prominent public account-entry buttons now invoke the provided sign-in flow from direct user interaction.
