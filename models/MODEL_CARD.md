# StimaSense Outage Prediction Model

## Intended use

This model is a research prototype for estimating outage risk from storm-proxy
and temporal features. It supports application development and offline
evaluation. It is not validated for safety-critical decisions, dispatch,
customer compensation, public outage guarantees, or runtime inference in the
StimaSense application. Its eligibility is **Research Model**.

## Training data

The training workflow reads `storm_and_outage_merged_2014_2023.parquet`, a
historical US storm/outage dataset covering 2014–2023. The label is whether
`customers_out` is greater than zero. `customers_out` is deliberately excluded
from model inputs to prevent target leakage.

The tracked dataset contains 407,011 rows: 405,740 have a positive label
(99.6877%). A majority-positive classifier therefore achieves about 99.69%
accuracy without useful discrimination. Accuracy must not be presented as
evidence of model quality for this dataset.

Weather inputs are proxies available in that dataset:

- storm magnitude;
- storm duration;
- property damage;
- direct injuries;
- crop damage.

The pipeline also derives hour, weekday, month, and weekend indicators.

## Evaluation

Each run uses a stratified train/test split and records neural-network accuracy,
precision, recall, F1, loss, final training/validation loss, and a deterministic
random-forest baseline in `models/metrics.json`. The artifact also records the
seed and training hyperparameters.

Metrics must be evaluated against the baseline and checked for class imbalance.
A higher aggregate score does not establish geographic or operational validity.

## Reproducibility

The default seed is `42`. Python, NumPy, TensorFlow, the train/test split, and
the random-forest baseline are seeded. TensorFlow deterministic operations are
enabled where the installed runtime supports them. Dependencies are installed
from `services/prediction/requirements.lock`.

## Limitations and risks

- The training data is US-based while StimaSense targets Kenya; geographic
  transfer has not been validated.
- Damage and injury fields may only become known after a storm and therefore
  are unsuitable for a true advance-warning production model.
- Training proxies do not yet match the app's live weather feature semantics.
- No fairness, calibration, geographic holdout, or prospective evaluation has
  been completed.
- Generated predictions must be presented as estimates, not utility notices.

Before production use, replace proxy features with time-aligned Kenyan weather
and grid observations, define leakage-safe prediction cutoffs, evaluate on a
geographic/time holdout, calibrate probabilities, and document subgroup error.
