# SwachhSetu: PS-11 audit and Antigravity implementation prompt

Audit date: 19 September 2026. Repository: https://github.com/savaliyasaumil3-boop/Tech-Titans-bit-n-build

Audited HEAD: `d2f738a57f8336459fe0d97e760428e30b0eb1f8`, committed 19 September 2026, 16:46:57 IST. Application root: `waste-management/`.

## 1. Verdict and verification boundary

The application covers much of PS-11 at the interface level, with a usable foundation in Next.js, FastAPI, Supabase, Leaflet, and Recharts. It is not yet a reliable operational waste-management system. The biggest gaps are data integrity, real collection execution, trustworthy prediction/classification, and secure persisted workflows.

The latest commit genuinely adds an OR-Tools code path, image processing, historical-rate prediction, and telemetry-related alerts. Earlier claims that routing is exclusively greedy or classification is exclusively simulated are now outdated. However, the new classifier is a colour-rule heuristic, not a trained waste-recognition model; its confidence is artificially inflated. OR-Tools is limited to one vehicle and straight-line costs, with a greedy fallback.

This review inspected the repository's application-specific pages, provider/query paths, backend endpoints, algorithms, schema, configuration, and latest change set. It ran targeted local algorithm probes. It did not authenticate to the deployed application, inspect the live database, execute seed scripts, rotate credentials, run a full frontend build/browser test, or certify production security. OR-Tools was not installed in the audit runtime, so its branch was inspected in source; only the fallback branch was executed. No new frontend screenshots were attached to this message. Prior discussion was recovered through personal context; the shared-chat page itself could not be opened.

## 2. PS-11 coverage

All paths below are relative to `waste-management/`.

| Requirement | Verified implementation | Remaining issue |
|---|---|---|
| Bin monitoring | Bin schema, map/table, telemetry endpoint, realtime bin subscription | Missing authenticated ingestion, observation history, freshness handling, and reliable database failure behavior |
| Fill prediction | Fixed-rate function and historical-rate function in `backend/app/ml/predictor.py` | No trained/evaluated model; historical calculation sums snapshots; telemetry still calls fixed-rate predictor; prediction endpoint does not persist results |
| Waste classification | Upload UI/API and Pillow colour-feature rules | Artificial confidence; invalid images and backend failures can yield confident Plastic results; no model validation |
| Prioritization | Fill, urgency, heuristic risk, waste-type weighting | Duplicated browser/backend logic; no explicit location/service-area term; stale predictions can win; risk is not a calibrated probability |
| Route optimization | Single-vehicle OR-Tools capacity model, greedy fallback, remaining capacity sent by frontend | Haversine costs, top-12 truncation, no time windows/fleet assignment, no route persistence or dispatch lifecycle |
| Dashboard | Bin/vehicle markers, charts, priorities, alerts | Demo fallback conceals empty/error states; static KPI trends; displayed collection total is current truck load |
| Alerts | Telemetry threshold crossing and fill-spike alerts | No robust deduplication, stale-sensor management, forecast-driven scheduler, or real resolution state |
| Analytics | Waste-history aggregation and composition charts | History semantics are inconsistent; zones, recycling rate, and some recommendations are hardcoded |
| Waste estimation | Bin mass estimates and history weights | No reliable measured collection ledger or downstream recycling/rejection accounting |

## 3. Most important verified defects

### Critical: committed privileged credential and weak access boundaries

`backend/database/seed_history.py:7` contains a JWT whose decoded payload declares `service_role`. Its value is intentionally omitted here; validity/revocation was not tested. Treat it as exposed and rotate/revoke it through the owner-controlled Supabase project. Removing it from the current file alone does not revoke it. Supabase documents service-role keys as privileged and capable of bypassing RLS: https://supabase.com/docs/guides/getting-started/api-keys

Backend mutation routes have no authentication/authorization checks in the inspected code. `backend/database/schema.sql` defines permissive public read/insert/update policies, and begins with destructive table drops. These are repository definitions, not proof of what policies are deployed. `backend/app/core/config.py` includes wildcard CORS, while `main.py` enables credentials. `/health` reports healthy without checking database readiness.

### Critical: repeated sensor readings become invented waste generation

`backend/app/api/bins.py` inserts the entire current bin weight into `waste_records` for every telemetry reading. `predict_fill_hours_from_history()` sums these values as generated waste. Charts also sum them. The seed script uses the same table for generated daily quantities, so the table mixes incompatible meanings.

Reproduction: three readings of an unchanged 50 kg bin produced 150 kg/day and 8 hours until full; nine unchanged readings produced 450 kg/day and 2.7 hours. Sampling more frequently changes the forecast even though no waste was added. Separate observations, derived generation estimates, and completed collections.

### High: classification gives unsupported certainty

`backend/app/ml/vision_classifier.py` adds 45 percentage points to a score and clamps confidence to at least 82.5%. Solid green, white, and gray images returned Organic 92.8%, Paper 82.5%, and Metal 82.5%. Invalid image bytes returned Plastic 88%. The upload page independently returns Plastic 94.2% when the API fails. Image processing is present, but these outputs cannot support the claimed recognition confidence.

### High: live mode can still display demo records

`lib/supabase/queries.ts` returns demo bins, vehicles, alerts, and predictions on errors or empty results. `components/providers/app-data-provider.tsx` initializes from demo arrays and only replaces them when fetched arrays are nonempty. Missing configuration also enables demo mode automatically. Random provider simulation is now correctly restricted to demo mode, but silent substitution remains. `refreshData()` only changes a timestamp. Realtime updates cover bin inserts/updates, not all operational entities.

Direct frontend Supabase reads are not intrinsically insecure when correctly authorized. Here they also contradict the intended FastAPI-owned business flow and permit different priority/prediction logic to be displayed. Choose one authoritative operational boundary and enforce it.

### High: routes are previews, not executed collections

`backend/app/ml/routing.py` uses a Haversine matrix and attempts to visit all top-12 candidates with one vehicle. Excess demand makes that problem infeasible and causes heuristic fallback. Omitted bins have no structured reason. The frontend correctly subtracts current vehicle load, but the API trusts client-supplied capacity and demands instead of revalidating database state. The fallback can return an empty depot-to-depot route as a normal result.

`components/map/vehicle-marker.tsx` obtains an OSRM road polyline separately, while backend distance/time totals remain based on Haversine and a fixed 30 km/h assumption. The visual path and reported totals therefore have different sources. Route simulation is a marker animation, not GPS telemetry or collection completion.

### Other correctness issues

- `lib/services/priority-engine.ts` constructs a map from newest-first prediction rows; later entries overwrite earlier ones, allowing the oldest prediction for a bin to win.
- Prediction endpoint priority uses literal Plastic rather than bin metadata. Telemetry tries to load metadata but swallows lookup failures and supplies defaults. Verify Python Supabase method compatibility for its `maybeSingle()` call.
- Telemetry accepts battery/temperature but does not persist them, lacks observation timestamps/idempotency, and can report success without a configured database.
- Alert IDs based only on whole-second timestamps can collide across bins. Threshold-transition checks alone are not durable deduplication.
- Reading an alert is treated as resolving it. Failed writes need rollback/error display.
- Current vehicle load is not today's collected weight: unloading a truck would incorrectly lower that KPI.
- Analytics requests ten days of history but labels a total monthly. Date grouping uses display strings rather than stable timezone-aware date keys.
- No application test suite or CI workflow was found in the tracked inventory inspected.

## 4. Frontend actions that need wiring

| UI | Current behavior | Required result |
|---|---|---|
| Bin table Collect | Stops event propagation only | Create a persisted collection request; assign through dispatcher |
| Bin drawer action buttons / priority collect control | No operational handler | Open history or request/assign collection as labeled |
| Vehicle Dispatch / Track | Buttons without handlers | Persist dispatch; open GPS view with timestamp/freshness |
| Route Optimize | Computes in-memory preview | Save a versioned plan with feasibility and omissions |
| Route simulation | Animates route marker | Keep as labeled demo; separate actual driver execution |
| Settings Save | Temporary saved message | Validate and persist settings used by backend logic |
| Header search / bell | Unwired search; fixed badge 3 | Real search, actual unread count, alert navigation |
| Profile / Settings / Sign Out menu | No actions | Account data, navigation, authenticated sign-out |
| Refresh | Updates timestamp only | Refetch authoritative data; report failed refresh |
| Resolve alert | Marks `is_read` | Separate acknowledgement and operational resolution |

## 5. Real-world data and architecture recommendations

### Use each source only for what it actually measures

| Source | Appropriate use | Important limit |
|---|---|---|
| Campus/site survey plus operator observations | Actual bins, capacities, permitted access, fill observations and collection weights | Must be collected locally; do not fabricate earlier history |
| OpenStreetMap | Candidate bin/recycling locations and road context | Mapping coverage and attributes vary; mapped bins are not verified instrumented assets |
| OSRM | Road travel matrices and route geometry | Default route estimates are not proof of live traffic; use a configurable service and handle unavailable roads |
| TrashNet | Initial waste-image training/evaluation | Six classes include cardboard and trash, but no organic class; images use controlled backgrounds |
| TACO | Litter detection in varied environments | Taxonomy mapping and class balance need review; not a direct six-class production classifier |
| World Bank What a Waste | Background city/country waste context | Aggregate data is not live Ahmedabad bin telemetry or a substitute for local time series |

Research references:

- [OSM waste basket tagging](https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dwaste_basket)
- [OSRM Table and Route APIs](https://project-osrm.org/docs/v5.24.0/api/)
- [TrashNet dataset and collection conditions](https://github.com/garythung/trashnet)
- [TACO dataset and taxonomy](https://github.com/pedropro/TACO)
- [World Bank What a Waste](https://www.worldbank.org/en/publication/what-a-waste)
- [OR-Tools capacity constraints](https://developers.google.com/optimization/routing/cvrp)

A realistic first deployment is one campus or bounded service area with roughly 10–20 physically verified bins and one or two vehicles. This is a proposed pilot scope, not an existing dataset. QR-based manual readings and collection confirmation allow operation before sensors are available. Even a short measured pilot is useful for workflow validation, but it does not prove a generalizable forecasting model. Keep synthetic training/demo scenarios separate and labeled.

The strongest additions are: complete driver collection workflow; sensor freshness/anomaly handling; capacity- and waste-compatible fleet assignment; supervised rerouting after a missed pickup; downstream recycling receipts; and a baseline-versus-optimized comparison using identical input conditions. These make existing PS-11 functionality operational rather than adding unrelated screens.

---

## 6. Copy into Antigravity from here

You are the lead engineer implementing SwachhSetu for PS-11: AI-Powered Waste Management & Recycling Optimizer. Work in the existing repository https://github.com/savaliyasaumil3-boop/Tech-Titans-bit-n-build, app root `waste-management/`.

Your task is to implement and verify the changes below, not merely write a plan. Preserve useful existing UI and working features. Target a trustworthy hackathon pilot with a documented production-hardening path. Do not claim production readiness, model accuracy, real data, or savings without evidence.

### A. Start with current evidence

1. Read repository instructions including AGENTS.md and CLAUDE.md. Follow the installed Next.js documentation rule before editing frontend code.
2. Record branch and HEAD. This brief audited `d2f738a57f8336459fe0d97e760428e30b0eb1f8`; inspect subsequent changes and mark each finding still present, already fixed, or unverified. Do not overwrite newer fixes or the user's work. Use an isolated branch where practical.
3. Inventory every application page, interactive control, endpoint, schema, data source and fallback. Create `docs/ps11-audit.md` mapping all nine PS deliverables to evidence and acceptance tests.
4. Retain Next.js/TypeScript/Tailwind/Leaflet, FastAPI/Python, Supabase PostgreSQL, and the existing OR-Tools integration unless a concrete blocker requires a small change. Do not rewrite the app or introduce unnecessary microservices.
5. Implement in the ordered milestones below. Keep a persistent checklist and continue through authorized local implementation/testing. If credentials, physical observations, compute or external services are unavailable, implement the adapter and safe failure behavior, record the exact blocker, and continue independent work. Never manufacture success.

### B. P0: security and truthful application state

- Remove the embedded service-role credential from `backend/database/seed_history.py`; use server-only environment configuration. Scan current files and git history without printing secret values. Document owner-required rotation/revocation and secure deployment-secret replacement. Do not use the leaked key or rewrite shared git history without authorization. Do not mark exposure resolved just because the file is cleaned.
- Add Supabase Auth integration, backend token verification and server-enforced roles: administrator, dispatcher, driver/operator, read-only viewer. Drivers can mutate only assigned work. Define a deployment/site authorization boundary; enforce it on IDs, queries, realtime subscriptions, uploads and exports. Never trust a client-supplied role, site, capacity or ownership claim.
- Replace permissive public writes with least-privilege policies. Keep service-role access exclusively server-side and authorize requests before using it. Test denied and cross-site/cross-assignment operations.
- Use additive versioned migrations; never run the DROP-based schema against existing data. Provide backup/rollback guidance and verify migrations against a disposable database.
- Remove wildcard credentialed CORS. Validate configuration deterministically independent of launch directory. Add request validation, bounded pagination, payload limits, upload decoding limits, rate limits for expensive operations and redacted structured errors/logs.
- Separate LIVE and DEMO explicitly. LIVE starts with empty/loading state, never seeded arrays. Database outages show unavailable/stale states, and empty tables show an onboarding empty state. Never fall back to demo records, fabricated classifications or successful memory writes.
- DEMO remains available as a separately labeled dataset/workspace using deterministic scenarios. Label simulated vehicles, observations, histories, model metrics and route movement. No mixing synthetic and real metrics.
- Create typed operational API clients. Use FastAPI as the authoritative operational business layer; keep Supabase browser SDK for Auth and authorized realtime invalidation as appropriate. Centralize prediction, priority, alert and aggregation logic server-side.
- Replace optimistic success without confirmation with pending/success/error states and rollback. Refresh must fetch; connection status must reflect an actual connection; pausing updates must have defined behavior.

### C. P1: fix the domain model and complete one collection cycle

Use explicit units and source provenance. Extend existing tables with migrations and add these concepts as needed:

- Sites/service areas and depots/facilities with verified coordinates, timezone, operating windows and accepted waste types.
- Bins: stable ID/QR, site, location, capacity in volume where known, calibrated mass capacity if known, accepted material, verification/source status and active state.
- Observations: bin/device/operator, observed_at and received_at, fill percentage, optional measured weight, optional estimated weight with method, battery/temperature, quality flags, source kind, external ID/idempotency key.
- Predictions: bin, created_at, input cutoff, model/method/version, horizon, predicted fill/time-to-full, uncertainty or unavailable reason, data sufficiency and expiry.
- Routes and ordered stops: version, planning inputs, assigned vehicle/driver, load constraints, ETA, geometry, solver, matrix source, status and unassigned-bin reasons.
- Collection events: unique operation ID, route stop, bin/vehicle/operator, time, measured or explicitly estimated weight, residual fill, material breakdown, outcome and optional evidence.
- Unloading/facility receipts: vehicle, time, facility, gross/net measured amounts where available, material accepted/rejected/composted/unknown. Never label collected recyclable material as confirmed recycled before a receipt.
- Alerts with open/acknowledged/resolved state, reason, assignee, deduplication key and timestamps; operational settings with revision/audit; immutable action audit events.

Specific requirements:

1. Store telemetry as observations, not generated or collected waste. Repeated identical readings must not add mass. Derive generation only from justified changes between valid observations, accounting for collection events and measurement noise. Preserve uncertain intervals instead of inventing values. Quarantine ambiguous legacy `waste_records`; do not silently relabel them as real measurements.
2. Do not treat volume fill percentage as measured mass. Use measured weight when available; otherwise use a documented density/calibration estimate and expose uncertainty. Check weight and volume capacities independently where supported.
3. Validate IDs, coordinates, timestamps, fill ranges, nonnegative weights, capacities and supported waste types. Unknown bins return 404; missing dependencies return 503. Reject or flag future/out-of-order readings. Preserve history without letting old observations overwrite current state. Use UUIDs and unique idempotency keys rather than second-based IDs.
4. Make telemetry persistence and derived-state updates transactional where feasible. If predictions are asynchronous, persist work durably and expose prediction-pending state. Use the SDK's actual supported Python methods; do not swallow lookup errors and invent metadata.
5. Build a mobile-friendly operator/driver workflow: assigned route → start → navigate → arrive → complete pickup with measured/estimated weight and residual fill → next stop → unload → complete route. Provide skip/block reasons and a resumable state after refresh.
6. Completion must atomically create one collection event, update bin residual state and vehicle load, mark the stop, record audit, update relevant alerts and invalidate affected summaries. Validate capacity again at execution time. Use transactional locking/version checks and idempotency to prevent double collections or duplicate dispatch.
7. Unloading reduces current vehicle load without reducing historical collected totals. Partial collections remain explicit. Duplicate submissions return the existing result. Two concurrent assignments cannot claim the same active bin/stop.
8. Provide QR/manual observations for sites without sensors. A small offline submission queue may follow the reliable online flow; queued actions must be visibly pending and idempotent on replay.

### D. P2: genuine fill forecasting, priorities and alerts

- Remove snapshot summation. Establish an interpretable baseline from valid within-cycle fill changes and elapsed time; account for resets and irregular intervals.
- Implement a reproducible scikit-learn forecasting training/evaluation pipeline using appropriate lag/rate features, time-of-day/day-of-week and validated contextual features. Train on acquired observations only when adequate; synthetic data may exercise the pipeline but cannot prove field accuracy. Use chronological held-out evaluation and compare against a simple baseline. Avoid leakage across time and collection cycles.
- Report fill MAE at defined horizons, evaluated sample count/period and overflow-event metrics where sufficient labels exist. Derive time-to-full from the forecast with a clear horizon; return beyond-horizon/unknown when appropriate. Already full is zero time remaining, not an arbitrary half hour. No growth means unknown/beyond horizon, not imminent overflow.
- Persist forecast versions and use the newest nonexpired prediction. Fix the descending-order Map overwrite bug. Telemetry and scheduled refreshes must use the same forecast service.
- Cold-start bins get an explicitly labeled baseline with low data sufficiency. Uncalibrated rule scores must be called risk scores, not overflow probabilities. Show uncertainty only if it is defensibly calculated.
- Centralize explainable priorities using current fill, forecast urgency, waste type, configured sensitive locations/service areas, time since collection and data quality. Show component reasons and policy version. Add anti-starvation/service-age rules so remote bins are not indefinitely skipped.
- Detect stale/offline sensors, stuck values, implausible jumps and invalid readings. Treat anomalies as verification needs; do not automatically interpret every decrease as collection or every spike as real generation.
- Deduplicate active alerts with database constraints. Trigger forecast-based overflow and statistically justified area-generation anomalies through a reliable scheduled worker; keep jobs idempotent. Acknowledgement and resolution are separate. Sensor failures stay visible even when fill is unknown.

### E. P2: real image classification with honest uncertainty

- Replace the colour-rule classifier with a genuine trained/pretrained image model behind an inference interface. Prefer a compact locally runnable model with documented weights/version/license. If a hosted vision provider is used, keep keys server-side and clearly identify the actual provider/model. Do not pretend model-generated confidence is calibrated.
- Support Plastic, Paper, Metal, Glass, Organic and Other. E-waste can be an extra supported class or a manual-review flag; do not claim unsupported model coverage.
- Provide reproducible dataset acquisition, taxonomy mapping and training/evaluation scripts. TrashNet lacks Organic and uses controlled backgrounds; map cardboard deliberately and acquire separately licensed organic examples. Review TACO's taxonomy/imbalance and image licensing before use. Keep local field evaluation images separate from training and remove near-duplicate leakage.
- Validate uploads by decoding, content and size/pixel bounds. Corrupt/nonimage inputs return 4xx. Model/service unavailability returns a clear unavailable response. Delete both backend Plastic 88% and frontend Plastic 94.2% fallbacks and the confidence floor.
- Support low-confidence/unknown/non-waste/mixed-image review. If probabilities are uncalibrated, label model scores. Persist original prediction, model version and operator correction without treating one correction as automatic retraining.
- Sample-image buttons must either run actual inference or be visibly marked examples. Link classification to an observation or collection verification workflow with human confirmation. A photograph does not measure waste mass or establish whole-bin composition.
- Material category alone does not prove local recyclability. Use configurable facility acceptance/contamination rules. Remove universal recycling, carbon-offset and decomposition claims unless method/source and applicable conditions are recorded. Keep hazardous/e-waste out of ordinary mixed collection by policy.

### F. P2: operational route planning

- Extend existing OR-Tools code rather than replacing it blindly. Fetch authoritative vehicle capacities, existing loads, availability, location and candidate bins on the backend. Treat client IDs/options as requests, not trusted operational facts.
- Use a configurable road routing provider (OSRM Table for costs and Route for geometry). Cache matrices with source/version/time. Costs, displayed route and totals must agree. Handle unreachable legs explicitly. Label Haversine fallback as an estimate and do not claim live traffic without a provider.
- Support multiple available vehicles, remaining mass/volume capacity, waste compatibility, start/end locations, service time, shifts/time windows and configured bin urgency. Start with one unload at route end; add intermediate unloading only with explicit load-reset modeling.
- Use solver time limits, reasonable candidate batching and documented priorities/penalties. Remove unexplained top-12 truncation. Return every unassigned bin with reason: capacity, incompatible material, unreachable, outside shift, or another explicit constraint. Do not label a zero-stop result successful optimization when work remains.
- Return solver/method, feasibility, planned pickup load, expected arrival/load per stop, omissions and road-source metadata. Do not imply a feasible heuristic solution is globally optimal.
- Persist draft plans. Dispatch validates current state and creates assignments atomically. Support plan versions and preserve completed/in-progress stops when replanning.
- Add supervised emergency rerouting for a missed collection, new urgent bin or unavailable vehicle. Show the proposed change and consequences before dispatching it. Avoid automatic route thrashing with cooldowns/hysteresis.
- Keep route animation as demo only. Real vehicle tracking needs authenticated timestamped GPS/operator location, freshness display and assigned-user privacy controls.

### G. P3: connect every frontend control and fix analytics

- Wire bin Collect, drawer actions, priority actions, vehicle Dispatch/Track, route Save/Dispatch/Start, header search/bell/profile/sign-out and real Refresh. Persist settings with validation; backend thresholds must use them. If an optional control is intentionally deferred, disable it with an explicit reason rather than leaving a deceptive active button.
- Keep existing filters/navigation where working. Add error, empty, pending, stale and unauthorized states. Revalidate affected data after mutations/realtime notifications, including bin deletion, vehicles, predictions, alerts, collections and route updates. Clean up subscriptions and object URLs.
- Show acquisition timestamp, data source and freshness in operational details. Do not use a green LIVE badge just because a toggle is enabled.
- Calculate today's collected weight from completed collection events using site timezone. Show truck current load separately. Compute trends from comparable actual periods; use unavailable when baseline is absent or zero.
- Replace hardcoded 87.4% recycling rate, zone quantities, trend percentages and area recommendations. Date filters must match labels; use actual date keys, not locale display strings for sorting/grouping.
- Distinguish generated estimate, current stored waste, collected weight, potentially recyclable material, facility-confirmed recovery, composting, rejected residual and unknown outcome. Reconcile collection/receipt mass without double counting. Unknown is not automatically non-recyclable.
- Add material/facility acceptance and contamination review; report measured contamination only when measurements exist. Base schedule recommendations on reproducible evidence and show observation window/sample count. Operators should accept/reject proposed changes.
- Add an impact comparison using the same bins, fleet, road matrix, capacities, service rules and planning horizon for baseline and optimized plans. Report distance/time, capacity feasibility, bins served/unserved and forecast late-service risk. Label planned estimates versus measured outcomes. Do not hardcode improvement percentages or emissions savings.
- Add a useful CSV export respecting filters/authorization, with units, timestamps and source fields, and protect against spreadsheet formula injection.

### H. Real-data onboarding

1. Create import templates for bin inventory, vehicles, timestamped observations, collections and facility receipts. Provide preview/dry-run, row errors, units, coordinates, duplicates, source IDs and idempotent import batches.
2. Implement a bounded OSM discovery/import option for candidate locations, including attribution and source IDs. Do not invent mapped objects, capacities or sensor histories. Require operator verification before dispatch eligibility. Supply a CSV/manual route if OSM coverage or network access is insufficient.
3. Use a small campus/service-area pilot. Record real observations and measured weights with actual dates. Provide operator instructions. Do not backdate observations or turn random seed histories into real data.
4. Keep synthetic fixtures deterministic and isolated. Provide scenarios for overflow, insufficient fleet capacity, stale sensor, invalid image, missed pickup, duplicate telemetry and service outage.
5. Document source URL, retrieval time, license/usage restrictions, geography, date coverage, transformation and intended use in `docs/data-sources.md`. Public aggregate waste datasets are contextual data, not local bin measurements. Never promise a live municipal feed without verifying an accessible feed and its fields.

### I. Verification and delivery gates

Add meaningful regression and integration tests, then run lint, typecheck, frontend build, backend tests and a browser walkthrough against a disposable/test environment. Run dependency/security scans if available; report actual tool outputs and limitations. Do not bypass failing checks.

Required cases:

1. LIVE with zero rows shows an empty state; unavailable backend/database shows failure, not demo data or successful memory writes.
2. Identical sensor readings do not increase generated/collected weight; higher sampling frequency alone does not change estimated generation.
3. A real accepted observation persists, updates current state, leads to persisted prediction/priority and creates at most one matching active alert.
4. Unknown bins, invalid ranges, stale/out-of-order events and duplicate timestamps/IDs are handled deterministically.
5. Latest prediction selection, full bins, no-growth histories and collection resets are correct.
6. Valid image inference is distinguishable from an example; invalid images fail; no model means unavailable; no confidence floors remain.
7. Planning respects existing vehicle load, waste compatibility, shift limits and unreachable roads. Excess demand is returned as explicit unassigned work; zero-capacity vehicles cannot receive pickups.
8. Dispatch and collection survive reloads. Repeated/concurrent completion records exactly one event and never exceeds capacity. Failed transactions leave no partial completion.
9. Unloading changes current load but not historical collected totals. Analytics totals reconcile to event/receipt records and selected dates.
10. Unauthorized users/devices and cross-assignment/site access are denied. Exports and realtime data respect the same scope.
11. Every visible action has a tested effect or explicit disabled state; Save Settings survives restart and affects backend behavior.
12. Optimized-versus-baseline comparison uses identical conditions and does not invent savings.

Deliver updated code, safe migrations, environment examples, reproducible startup instructions, API contract, tests/results, `docs/ps11-audit.md`, `docs/data-sources.md`, `docs/model-card.md`, `docs/deployment.md` and `docs/demo-script.md`.

The demo script should show: authenticated operator submits a bin observation → stored history and explainable forecast update → alert/prioritization → capacity-safe road route → dispatcher assigns → driver confirms pickup → bin and truck states update → facility receipt → reconciled collection/recycling dashboard → identical-input impact comparison. Use genuine local observations where available and clearly label any replay/simulation.

Provide a final requirement-by-requirement status with changed files, tests actually run, unresolved blockers and remaining production work. A green build does not prove field accuracy or production readiness. Do not stop at decorative UI changes, fabricated data, stub endpoints or a plan-only response.

## End of Antigravity prompt
