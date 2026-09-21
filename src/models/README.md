# Runtime model assets

No Operational Model is bundled with StimaSense. Runtime inference intentionally returns `OperationalModelUnavailableError` until an artifact passes the admission criteria in the root README and model card.

The previous files in this directory were placeholders with incompatible inputs and no validated weights. They were removed so a production build cannot mistake them for an eligible model.

A future reviewed model bundle must include, atomically:

- TensorFlow.js topology and weight shards;
- model version and integrity hash;
- exact ordered input feature names and shapes;
- preprocessing/scaler parameters;
- six-hour output semantics and threshold metadata;
- training dataset provenance and evaluation artifact;
- a test proving training export and mobile inference agree on fixed fixtures.

Research artifacts belong under the root `models/` directory and are not loaded by the application.
