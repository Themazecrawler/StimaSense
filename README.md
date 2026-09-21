# StimaSense

StimaSense is a React Native application for sourced electricity-interruption information in Kenya. It currently supports live WeatherAPI observations and validated Kenya Power planned-interruption notices. It deliberately does **not** produce outage-risk predictions until a model trained and validated for Kenyan service areas is available.

## Capability status

| Capability | Status | Source of truth |
| --- | --- | --- |
| Current weather | Available when configured and location permission is granted | WeatherAPI observation and provider timestamp |
| Planned interruptions | Available only when the scraper produces complete, current notices | Kenya Power source URL and time window |
| Live outage predictions | Unavailable | No Operational Model exists |
| Active-outage map | Unavailable | No verified geospatial outage feed exists |
| Community reporting | Disabled | Schema exists, but deployment/moderation must be completed first |
| Synthetic data | Internal development only | Never substituted into production states |

Unavailable dependencies affect only their features. The app renders explicit loading, stale, unavailable, and error states instead of inventing operational data.

## Requirements

- Node.js 20.19.4 or newer
- npm and the React Native Android/iOS prerequisites
- JDK 17 and Android Studio for Android builds
- Xcode and CocoaPods for iOS builds
- Python 3.11 for training and scraper validation

## Local setup

```bash
git clone https://github.com/Themazecrawler/StimaSense.git
cd StimaSense
npm ci
cp .env.example .env
```

Configure `.env`:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_public_anon_key
WEATHER_API_KEY=your_weatherapi_key
GOOGLE_MAPS_API_KEY=your_restricted_android_key
SENTRY_DSN=
APP_ENVIRONMENT=development
DEMO_MODE=false
```

`DEMO_MODE` is honored only by development builds. Production code contains no synthetic operational fallback.

Apply [the Supabase migration](supabase/migrations/20260921000000_initial_security.sql) before enabling profiles or community reports. It creates the reproducible schema and row-level-security policies. Community submission remains disabled until deployment and moderation are verified.

Run the app:

```bash
npm start
npm run android
# or, on macOS
npm run ios
```

## Verification

```bash
npm run lint
npm run typecheck
npm run test:ci
npm run audit
python -m unittest discover -s services/prediction/tests -v
python -m unittest discover -s services/kplc/scraper/tests -v
```

CI runs these gates on pushes to `main` and pull requests, then compiles an Android debug application. Dependency audit exceptions are machine-readable in `security-audit-exceptions.json`; new or expired high/critical findings fail CI.

## Runtime architecture

```text
Screens
  ├─ WeatherService ── WeatherAPI
  ├─ KPLCPlannedOutageService ── validated bundled/remote snapshot
  ├─ Supabase client ── auth, profiles, protected report schema
  └─ prediction boundary ── unavailable until Operational Model admission

Observability
  ├─ structured event logger
  └─ optional Sentry adapter (PII and tracing disabled)
```

Screens render state; backend modules own external I/O; ML modules own model eligibility and inference. See [CONTEXT.md](CONTEXT.md) for canonical domain language and [architecture decisions](docs/adr/) for the rationale.

## Data truth and freshness

- Current weather is considered fresh for 30 minutes using the provider observation timestamp.
- Stale observations remain visibly labelled; they never become current by being rewrapped locally.
- KPLC entries require a region, area, HTTPS source, and valid start/end timestamps. Invalid or empty runs fail without overwriting the prior snapshot.
- A Planned Interruption Notice confirms a utility schedule, not a currently active outage.
- Location failure never substitutes Nairobi, San Francisco, or another default coordinate.

## Observability

Set `SENTRY_DSN` in production to enable error reporting. The logger redacts fields whose names indicate credentials, identity, feedback content, or precise coordinates. Sentry default PII collection and performance tracing are disabled. Without a DSN, structured development logs continue locally and the app remains usable.

## Research model reproduction

The current training pipeline is research-only. Its dataset is US storm/outage data, contains no Kenyan observations, uses post-event proxy fields, and is unsuitable for live Kenyan prediction.

Install the locked environment and run tests:

```bash
python -m pip install -r services/prediction/requirements.lock
python -m unittest discover -s services/prediction/tests -v
python services/prediction/train_from_parquet.py \
  --input services/prediction/data/storm_and_outage_merged_2014_2023.parquet \
  --output models \
  --seed 42 \
  --epochs 50 \
  --batch-size 32 \
  --test-size 0.2
```

Training writes metrics and metadata under `models/`. Rebuild the lock only when dependencies intentionally change:

```bash
uv pip compile services/prediction/requirements.txt \
  --output-file services/prediction/requirements.lock \
  --generate-hashes \
  --python-version 3.11
```

Read [the model card](models/MODEL_CARD.md) before interpreting any metric. Aggregate accuracy is especially misleading because the current research label is profoundly imbalanced.

## Operational-model admission

A Research Model may become an Operational Model only when it has:

- documented Kenyan dataset provenance and license;
- runtime-obtainable pre-event features with matching preprocessing metadata;
- temporal and geographic holdouts;
- precision, recall, PR-AUC, calibration, and simple-baseline comparisons;
- thresholds selected from measured alert costs and class balance;
- a deterministic training-to-mobile artifact round-trip test;
- a versioned model bundle reviewed with an application release.

Until then, prediction methods reject inference and the UI says prediction is unavailable.

## KPLC ingestion

The scheduled workflow installs `services/kplc/scraper/requirements.txt`, tests validation, fetches Kenya Power notices, and mirrors one validated snapshot into `models/` and `src/models/`. Fetch, parse, or data-quality failures exit non-zero and preserve the last valid commit.

Run locally:

```bash
python -m pip install -r services/kplc/scraper/requirements.txt
python services/kplc/scraper/fetch_kplc_planned_outages.py \
  models/planned_outages.json \
  --mirror src/models/planned_outages.json
```

## Security notes

- Never commit `.env`; only `.env.example` is tracked.
- Previously committed WeatherAPI and Google Maps credentials must be rotated before release.
- Restrict the Google Maps key by application ID/signing certificate and enabled APIs.
- Treat the Supabase anon key as a public client credential; authorization depends on deployed RLS policies.
- Git history is not rewritten by default after rotation.

## Release checklist

1. Rotate and restrict previously exposed provider credentials.
2. Deploy and verify Supabase migrations/RLS.
3. Supply production environment values through the build/CI secret store.
4. Confirm lint, typecheck, coverage, audit policy, Python tests, and Android build are green from a fresh clone.
5. Confirm production screens contain no demo data and every external record exposes provenance and time.
