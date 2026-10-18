# sync-engine 1.1.0 structure and modularity audit

Reviewed the installed 1.1.0 documentation: Designing with concepts, Application
authoring, Public API (including now), Concept specification, and Execution
semantics (queries, composition, and diagnostics). Source documentation lives
in node_modules/@mit-sdg/sync-engine/docs/user/.

## Findings and corrections

1. Concept boundaries were independent. No implementation imports a peer
   concept, the concept set, application assembly, or composition. Registries
   connect each class only to its own specification and refusal classes.
2. Sessioning and TaskSetting read injected clocks. The documentation instead
   specifies explicit instant inputs supplied by framework-owned now(instant)
   in reaction conditions. Corrected action/query contracts and compositions.
   Session checking and deadline validation now observe one flow timestamp.
3. The implemented inventory lived in auth-types.md while types.md retained
   the unimplemented original inventory. Consolidated the current contract into
   design/types.md. Preserved the original inventory and unimplemented
   TaskSuggesting/TaskSuggestions documents under design/drafts/.
4. The browser imported TaskSetting data types directly. Although type-only
   imports introduce no runtime calls, it now derives those types from the
   generated HTTP wire contract, matching the documented client boundary.
5. Documented deterministic query ordering: active memberships use addition
   order and completed memberships use completion order.

## Verified structure and connections

| Area | Result |
| --- | --- |
| Concept-local state | Authenticating owns credentials; Sessioning owns sessions; TaskSetting owns task details; TaskListing owns task membership. |
| Storage | Each concept receives a separate collection from host wiring. Concepts cannot access peer collections through their constructors. |
| Shared identities | Sessioning.Subject and user parameters bind to Authenticating.Account; TaskListing.Task binds directly to TaskSetting.Task. Sharing opaque identities does not share owned facts. |
| Application writes | Cross-concept actions occur only in endpoint reaction trees under src/compositions/. No imperative peer calls are hidden in concept methods or server routes. |
| Application reads | The list former joins TaskListing membership queries with TaskSetting owner-filtered details using each(...).where(...).form(...). Neither concept performs the join. |
| Specifications | All four registered concepts have the strict required sections, structured actions/queries, and declared refusals. |
| Application documentation | Every selected endpoint and former has an exact typed prose link; endpoint paths and static instance bindings match assembly. |
| Registration and assembly | registerConcept, conceptSet, ImplementationOverrides, and assemble use supported public APIs. MongoDB instances are injected by the host, not constructed by peer concepts. |
| Frontend boundary | Vue uses the generated projected HTTP contract and typed client. Cookie credentials and time inputs are supplied by their proper framework boundaries. |
| Generated evidence | Wire types and read-back are regenerated, not edited manually. |

TaskSetting.updateTask is a partial edit action, but it does not delegate its
invariants to callers: ownership, field validation, optional-field flags, and
atomic updates remain inside TaskSetting. Its field-specific actions use private
helpers, without calling peers. Retaining task details after list deletion is
an explicit membership/detail separation, not a shared-state dependency.

## Diagnostics and verification

- All 71 tests pass, including four import-boundary checks and a flow-time test
  proving that callers cannot override the timestamp.
- Config-based source/design checking, generated-artifact checking, TypeScript,
  and the frontend build pass.
- Nine MISSING_ENDPOINT_FALLBACK warnings remain. Execution semantics documents
  the analyzer's restricted coverage proof: action chains with nonempty output
  bindings are outside its recognized total-chain proof. These endpoints bind
  successful action outputs and also use standard boundary refusal/fault funnels.
  Valid and refused HTTP paths are tested; the checker does not prove totality
  for all possible runtime outcomes. Adding an unconditional sibling fallback
  would risk multiple responses and is not an appropriate warning workaround.
- One ORDER_SENSITIVE_FORMER informational advisory remains. The former
  intentionally preserves the documented membership order from concept queries.

These diagnostics are disclosed rather than suppressed. Structural validation
does not prove every prose statement or arbitrary runtime behavior; concept and
HTTP tests separately validate the implemented behavior.
