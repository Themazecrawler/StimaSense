Training From Parquet (storm_and_outage_merged_2014_2023.parquet)

Steps:
1) Create a Python venv and install dependencies (see requirements below).
2) Run `python train_from_parquet.py --input ./storm_and_outage_merged_2014_2023.parquet`.
3) Outputs will be written to `./models/` (TFJS model, preprocessing params, metadata).

Minimal requirements.txt:
```
tensorflow==2.15.0
tensorflowjs==4.20.0
pandas==2.2.2
numpy==1.26.4
scikit-learn==1.5.1
imbalanced-learn==0.12.3
joblib==1.4.2
pyarrow==16.1.0
matplotlib==3.8.4
``` 

Notes:
- The script infers weather/grid/temporal columns if present; customize mappings as needed.

