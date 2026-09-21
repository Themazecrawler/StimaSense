# StimaSense

StimaSense communicates electrical-outage risk using current operating data and clearly distinguishes operational results from demonstrations.

## Language

**Live Prediction**:
An outage-risk estimate produced at runtime from current input data by the deployed prediction model.
_Avoid_: Prediction, fallback prediction, mock prediction

**Demo Prediction**:
A synthetic or predefined outage-risk estimate shown only when the application is explicitly operating in a labelled demonstration mode.
_Avoid_: Live prediction, fallback prediction

**Live Observation**:
Data retrieved from an identified operational source and still within its defined freshness period.
_Avoid_: Live data when its source or retrieval time is unknown

**Stale Observation**:
A previously live observation whose freshness period has expired, displayed with its source timestamp and stale status.
_Avoid_: Live observation, current data

**Local Model Feedback**:
User feedback retained for local model evaluation or future retraining; it does not imply that updates leave the device or are centrally aggregated.
_Avoid_: Federated learning

**Operational Model**:
A versioned prediction model approved for Live Predictions because its training features, runtime inputs, preprocessing metadata, and validation evidence agree.
_Avoid_: Production model, live model

**Research Model**:
A trained artifact used for experimentation or evaluation but not approved to produce Live Predictions.
_Avoid_: Operational model

**Risk Advisory**:
A time-bounded notice that an Operational Model has identified elevated outage risk; it is not evidence that an outage has occurred.
_Avoid_: Outage alert, confirmed outage

**Outage Observation**:
Evidence that electricity service may be interrupted, tied to an identified source, service area, and observation time.
_Avoid_: Confirmed outage, alert

**Service Area**:
A named geographic area served by a shared part of the electricity network and used as the smallest unit for outage predictions when verified network mapping exists.
_Avoid_: Exact location, household location

**Official Outage**:
An Outage Observation issued by KPLC or another designated electricity-network authority stating that an interruption is active.
_Avoid_: Planned interruption notice, confirmed outage

**Corroborated Outage**:
An outage supported by multiple independent community reports or another defined corroborating source, but not issued by the electricity-network authority.
_Avoid_: Official outage

**Unverified Outage Report**:
A single community-submitted outage report that has not yet been independently corroborated.
_Avoid_: Confirmed outage, official outage

**Planned Interruption Notice**:
A future maintenance interruption scheduled by KPLC; it confirms the utility's plan, not that electricity is currently unavailable.
_Avoid_: Official outage, confirmed outage
