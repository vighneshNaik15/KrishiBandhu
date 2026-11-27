# KrishiBandhu crop inference service

The service loads a model on the first valid request for its crop. It keeps one model in memory and evicts it when the crop changes. The production container uses float32 LiteRT exports of the original Keras models. Local development can load the original `.h5` files directly. Model files belong in a private directory outside Git.

## Verified model metadata

The `.h5` metadata identifies each network as a 224×224×3 MobileNetV2 TensorFlow Hub feature-vector layer followed by a linear Dense layer. The serialized loss is `SparseCategoricalCrossentropy(from_logits=True)`. The class order below was checked against `train_ds.class_names` printed in the supplied model PDFs; the PDFs' validation metrics are reported results, not independently reproduced results.

| Crop | File | Output units | Output classes, in model order | Reported validation accuracy |
|---|---|---:|---|---:|
| Rice | `rice.h5` | 4 | `Bacterialblight`, `Blast`, `Brownspot`, `Tungro` | 99.16% |
| Cotton | `cotton_model.h5` | 4 | `bacterial_blight`, `curl_virus`, `fussarium_wilt`, `healthy` | 96.23% |
| Maize | `maize_model.h5` | 4 | `Blight`, `Common_Rust`, `Gray_Leaf_Spot`, `Healthy` | 90.82% |
| Sugarcane | `sugercane_model.h5` | 3 | `Bacterial Blight`, `Healthy`, `Red Rot` | 71.43% |

Model versions are SHA-256 digests of the original `.h5` files in both runtimes. The service verifies the converted file digest against its export manifest and checks model input and output shapes against `app/model_config.py` before serving predictions.

## Runtime and preprocessing

Use Python 3.11. `requirements.txt` pins TensorFlow 2.15.1, Keras 2, and TensorFlow Hub 0.16.1 for `.h5` loading and conversion. The TensorFlow Hub MobileNetV2 module may be downloaded on first use and cached in `TFHUB_CACHE_DIR`. `requirements-litert.txt` installs the production interpreter, which runs the exported graphs offline.

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
   uvicorn app.main:app --app-dir services\crop-inference --host 0.0.0.0 --port 8000 --workers 1
   ```

4. Set `NEXT_PUBLIC_CROP_DOCTOR_API_URL=http://localhost:8000` in the existing root `.env.local`, restart Next.js, and keep the existing Firebase client configuration. No Firebase project or client config is created by this service.

The service verifies Firebase ID tokens and requires an active `farmer` record in `users/{uid}`. It uses server-side Application Default Credentials only for verification and role lookup. Restrict network access to the inference service in deployment; CORS is not an authorization boundary.

## API

- `GET /health` is an HTTP 200 liveness check. `models_loaded` is the current cache occupancy (zero or one), and `models_expected` is the number of supported crops. It never triggers a model load.
- `GET /models` reports crop/model IDs, classes, input size, preprocessing, file version and per-model status. A model with an installed runtime and verified files reports available before its first load. A load error appears after the first failed prediction attempt.
- `POST /predict` accepts multipart fields `crop` (`rice`, `cotton`, `maize`, `sugarcane`) and `image`, and requires `Authorization: Bearer <Firebase ID token>`.

Prediction errors, unsupported crops, missing models, invalid image formats, oversized images, and Firebase authorization failures return explicit non-success HTTP responses. The service never substitutes a demo or random model.

## Production hosting

On a machine with the Keras dependencies and the original models, export to a new output directory from `services\crop-inference`. Conversion uses float32 built-in operators and checks logits and predicted classes against Keras for each crop. The export contains four `.tflite` files and `model-versions.json`.

```powershell
.\.venv\Scripts\python.exe -m app.convert_models models models/litert
```

Build the image for a Linux x86-64 container host. The image runs as a non-root user with one Uvicorn worker on `$PORT`, which defaults to `8000`. Stage the whole export directory at `/models` using a read-only mount. An image-only host can use a private derived image that copies that directory to `/models`.

```powershell
$cropModelPath = (Resolve-Path .\models\litert).Path
docker build --platform linux/amd64 -t krishibandhu-crop-inference .
docker run --rm --name crop-doctor-qa --memory 512m --memory-swap 512m -p 8000:8000 `
  -e FIREBASE_PROJECT_ID=your-existing-firebase-project-id `
  -e CORS_ALLOWED_ORIGINS=http://localhost:3000 `
  -v "${cropModelPath}:/models:ro" `
  -v "D:\private\google-adc:/run/credentials:ro" `
  -e GOOGLE_APPLICATION_CREDENTIALS=/run/credentials/application_default_credentials.json `
  krishibandhu-crop-inference
```

1. Point the host's HTTPS routing at `$PORT`. Set `CORS_ALLOWED_ORIGINS` to the exact frontend HTTPS origins, comma-separated with no trailing slash. Allow a 5 MiB upload plus multipart overhead.
2. Set `FIREBASE_PROJECT_ID` to the frontend's Firebase project. Use the host's service identity through Application Default Credentials or a secret-mounted file referenced by `GOOGLE_APPLICATION_CREDENTIALS`. The service identity needs Firebase Auth user access for revocation checks and Firestore access to read the caller's profile.
3. Check `/health` and confirm all four crops report available at `/models`. Test signed-in predictions that switch crops, repeat a warm crop, and use large supported photos. Check `docker exec crop-doctor-qa cat /sys/fs/cgroup/memory.peak` on a cgroup v2 Docker host, or check the hosting provider's peak memory metric. Verify the image under an actual 512 MB limit before enabling Crop Doctor on the public site.
4. After the hosted endpoint passes, use its public HTTPS base URL as `NEXT_PUBLIC_CROP_DOCTOR_API_URL` in Vercel.

For an image-only host, build a private image with the exported models as the build context. Keep credentials in the host's secret storage.

```powershell
@'
FROM krishibandhu-crop-inference
COPY . /models/
'@ | docker build --platform linux/amd64 -t krishibandhu-crop-inference-with-models -f - $cropModelPath
```

For a native Python host, install `requirements-litert.txt`, set `CROP_MODEL_RUNTIME=litert` and `CROP_MODEL_DIR` to the export directory, then start `uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --workers 1`.

### Memory measurements

A Windows Uvicorn process with one worker peaked at 59.5 MiB at startup, 114.8 MiB across small-image crop switches, and 347.4 MiB with two concurrent 30 MP RGBA PNG uploads. The benchmark used real model predictions and imported the Firebase SDK with authorization stubbed for the test. The one-model Keras process exceeded 650 MiB on the same large image. The Linux container's cgroup includes memory that Windows process working-set measurements omit, so verify the 512 MB limit on the target host.

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
.\services\crop-inference\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/crop-inference --host 127.0.0.1 --port 8000 --workers 1
```

In another terminal, run `Invoke-RestMethod http://localhost:8000/health` and `Invoke-RestMethod http://localhost:8000/models`. A fresh process reports zero cached models and lists the available crops. Authenticated predictions require working Firebase token verification and permission to read the caller's profile.
