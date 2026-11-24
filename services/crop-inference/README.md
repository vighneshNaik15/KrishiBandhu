# KrishiBandhu crop inference service

This service loads the supplied trained Keras models once at process startup. It does not contain copies of the model weights; place the four `.h5` files in a private model directory and set `CROP_MODEL_DIR` to that directory. The supplied files are about 9 MB each and are excluded from Git.

## Verified model metadata

The `.h5` metadata identifies each network as a 224×224×3 MobileNetV2 TensorFlow Hub feature-vector layer followed by a linear Dense layer. The serialized loss is `SparseCategoricalCrossentropy(from_logits=True)`. The class order below was checked against `train_ds.class_names` printed in the supplied model PDFs; the PDFs' validation metrics are reported results, not independently reproduced results.

| Crop | File | Output units | Output classes, in model order | Reported validation accuracy |
|---|---|---:|---|---:|
| Rice | `rice.h5` | 4 | `Bacterialblight`, `Blast`, `Brownspot`, `Tungro` | 99.16% |
| Cotton | `cotton_model.h5` | 4 | `bacterial_blight`, `curl_virus`, `fussarium_wilt`, `healthy` | 96.23% |
| Maize | `maize_model.h5` | 4 | `Blight`, `Common_Rust`, `Gray_Leaf_Spot`, `Healthy` | 90.82% |
| Sugarcane | `sugercane_model.h5` | 3 | `Bacterial Blight`, `Healthy`, `Red Rot` | 71.43% |

Model versions returned by the service are SHA-256 digests of the loaded files. Label order is deliberately centralized in `app/model_config.py`; the service checks the loaded input/output shapes against that configuration and will not serve a mismatched model.

## Runtime and preprocessing

Use Python 3.11 with the exact pins in `requirements.txt`. TensorFlow 2.15.1 and TensorFlow Hub 0.16.1 retain the Keras 2 `hub.KerasLayer` format used by these H5 files; do not upgrade TensorFlow to a Keras 3 runtime without migrating and validating the models. The TensorFlow Hub MobileNetV2 module may be downloaded from TensorFlow Hub on first load and cached in `TFHUB_CACHE_DIR`.

The service validates JPEG/PNG/WebP bytes and a 5 MB limit, converts to RGB, resizes to 224×224 with bilinear interpolation, converts to `float32`, and divides by 255. This matches the training dataset pipeline in the supplied PDFs (`image_dataset_from_directory` default bilinear resize plus `Rescaling(1./255)`). Model logits are softmax-normalized at inference. The returned values are model scores, not calibrated disease probabilities.

Low scores, a small top-score margin, and an original image dimension below 224 pixels produce an `uncertain` flag. These are conservative triage heuristics, not calibrated thresholds. The classifiers were trained only on their fixed labels; they have no validated out-of-domain detector and can assign an unrelated crop or unknown disease a high score. Every result therefore remains an unverified suggestion and requires expert review. The UI explicitly explains this limitation.

## Local setup (PowerShell)

1. Copy the four model files into `services/crop-inference/models/` (or keep them in a private external directory).
2. From the repository root, create and activate a Python 3.11 environment:

   ```powershell
   py -3.11 -m venv services\crop-inference\.venv
   .\services\crop-inference\.venv\Scripts\Activate.ps1
   pip install -r services\crop-inference\requirements.txt
   ```

3. Configure the service process. Use Google Application Default Credentials for a Firebase project with Auth and Firestore enabled; do not place a service-account key in this repository or in the container image.

   ```powershell
   $env:CROP_MODEL_DIR = (Resolve-Path .\services\crop-inference\models).Path
   $env:FIREBASE_PROJECT_ID = "your-existing-firebase-project-id"
   $env:CORS_ALLOWED_ORIGINS = "http://localhost:3000"
   $env:TFHUB_CACHE_DIR = "$env:LOCALAPPDATA\krishibandhu\tfhub"
   gcloud auth application-default login
   uvicorn app.main:app --app-dir services\crop-inference --host 0.0.0.0 --port 8000
   ```

4. Set `NEXT_PUBLIC_CROP_DOCTOR_API_URL=http://localhost:8000` in the existing root `.env.local`, restart Next.js, and keep the existing Firebase client configuration. No Firebase project or client config is created by this service.

The service verifies Firebase ID tokens and requires an active `farmer` record in `users/{uid}`. It uses server-side Application Default Credentials only for verification and role lookup. Restrict network access to the inference service in deployment; CORS is not an authorization boundary.

## API

- `GET /health` reports readiness and returns HTTP 503 unless all four models loaded.
- `GET /models` reports crop/model IDs, classes, input size, preprocessing, file version and per-model status; it does not expose file paths.
- `POST /predict` accepts multipart fields `crop` (`rice`, `cotton`, `maize`, `sugarcane`) and `image`, and requires `Authorization: Bearer <Firebase ID token>`.

Prediction errors, unsupported crops, missing models, invalid image formats, oversized images, and Firebase authorization failures return explicit non-success HTTP responses. The service never substitutes a demo or random model.

## Docker

From `services\crop-inference`:

```powershell
docker build -t krishibandhu-crop-inference .
docker run --rm -p 8000:8000 `
  -e FIREBASE_PROJECT_ID=your-existing-firebase-project-id `
  -e CORS_ALLOWED_ORIGINS=http://localhost:3000 `
  -v "D:\private\crop-models:/models:ro" `
  -v "D:\private\google-adc:/run/credentials:ro" `
  -e GOOGLE_APPLICATION_CREDENTIALS=/run/credentials/application_default_credentials.json `
  krishibandhu-crop-inference
```

Mount model files and credentials read-only at runtime. Never copy credentials into the image. TensorFlow Hub access is required on first start unless the compatible module cache is pre-populated.

## Checks

Run the model-independent preprocessing, score-guard, and class-order tests from the service directory:

```powershell
Set-Location services\crop-inference
python -m unittest discover -s tests -v
```

For this project on Windows, start the installed service from the repository root in a separate PowerShell terminal.

```powershell
$env:CROP_MODEL_DIR = (Resolve-Path services/crop-inference/models).Path
$env:FIREBASE_PROJECT_ID = 'krishibandhu-a500e'
$env:CORS_ALLOWED_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000'
$env:TFHUB_CACHE_DIR = "$env:LOCALAPPDATA\krishibandhu\tfhub"
.\services\crop-inference\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/crop-inference --host 127.0.0.1 --port 8000
```

In another terminal, run `Invoke-RestMethod http://localhost:8000/health` and `Invoke-RestMethod http://localhost:8000/models`. The health endpoint reports how many models loaded. Authenticated predictions also require working Firebase token verification and permission to read the caller's profile.
