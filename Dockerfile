# Reproducible environment for training the outage prediction model.
# Build:  docker build -t stimasense-train .
# Run:    docker run --rm -v "$PWD/models:/out" stimasense-train
FROM python:3.11-slim

WORKDIR /app

COPY services/prediction/requirements.txt services/prediction/requirements.lock ./services/prediction/
RUN pip install --no-cache-dir -r services/prediction/requirements.lock

COPY services/prediction ./services/prediction
COPY storm_and_outage_merged_2014_2023.parquet ./

ENTRYPOINT ["python", "services/prediction/train_from_parquet.py"]
CMD ["--input", "storm_and_outage_merged_2014_2023.parquet", "--output", "/out", "--seed", "42"]
