'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Camera,
  CloudSun,
  ImagePlus,
  RotateCcw,
  ShieldAlert,
  Stethoscope,
  Upload,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/AuthContext';
import type {
  CropDiseasePrediction,
  SupportedCrop,
} from '@/models/cropDiseaseAssessment';
import {
  analyzeCropImage,
  getCropModelStatuses,
  type CropModelStatus,
} from '@/services/cropInferenceService';
import { formatDateTime } from '@/utils/formatters';
import { ROUTES } from '@/lib/constants';

const CROPS: { id: SupportedCrop; label: string }[] = [
  { id: 'rice', label: 'Rice' },
  { id: 'cotton', label: 'Cotton' },
  { id: 'maize', label: 'Maize' },
  { id: 'sugarcane', label: 'Sugarcane' },
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getUncertaintyMessage(reasons: string[]): string {
  const messages: Record<string, string> = {
    low_model_score: 'The model scores are low.',
    small_score_margin: 'The top model scores are close together.',
    low_source_resolution: 'The original image is smaller than the model input.',
  };
  return reasons.map((reason) => messages[reason] ?? 'The result needs review.').join(' ');
}

export function CropDoctorPage() {
  const { firebaseUser } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState<SupportedCrop>('rice');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<CropDiseasePrediction | null>(null);
  const [modelStatuses, setModelStatuses] = useState<CropModelStatus[]>([]);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [assessmentTime, setAssessmentTime] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    getCropModelStatuses()
      .then((statuses) => {
        if (active) {
          setModelStatuses(statuses);
          setServiceError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setServiceError(error instanceof Error ? error.message : 'Model status could not be loaded.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectedModel = modelStatuses.find((model) => model.crop === crop);

  function chooseImage(file: File | undefined) {
    setImageError(null);
    setAnalysisError(null);
    setPrediction(null);
    setAssessmentTime(null);
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setImage(null);
      setPreviewUrl(null);
      setImageError('Use a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImage(null);
      setPreviewUrl(null);
      setImageError('The image must be 5 MB or smaller.');
      return;
    }
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function removeImage() {
    setImage(null);
    setPreviewUrl(null);
    setPrediction(null);
    setAssessmentTime(null);
    setImageError(null);
    setAnalysisError(null);
    if (fileInput.current) fileInput.current.value = '';
    if (cameraInput.current) cameraInput.current.value = '';
  }

  async function analyze() {
    if (!image || !firebaseUser) {
      setAnalysisError('Sign in as a farmer and select an image before analyzing.');
      return;
    }
    setAnalyzing(true);
    setAnalysisError(null);
    setPrediction(null);
    try {
      const idToken = await firebaseUser.getIdToken();
      const result = await analyzeCropImage(crop, image, idToken);
      setPrediction(result);
      setAssessmentTime(new Date());
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'The crop image could not be analyzed.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary-700">AI Crop Doctor</p>
          <h1 className="text-2xl font-bold font-heading text-neutral-900">
            Crop Disease Detection
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Get a model-generated suggestion for one of the supported crop classes.
          </p>
        </div>
        <Link
          href={ROUTES.FARMER_CROP_DOCTOR_HISTORY}
          className="text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          View assessment history
        </Link>
      </header>

      <Alert variant="warning" title="Model output is not a diagnosis">
        The model always selects among its known classes and has not been validated to recognize
        unrelated crops, unknown diseases, or every poor-quality image. Softmax scores are raw model
        scores, not calibrated disease probabilities. Verify the crop and result with an agricultural
        expert before taking action.
      </Alert>

      {serviceError && <Alert variant="error" title="Inference service unavailable">{serviceError}</Alert>}
      {imageError && <Alert variant="error" title="Image not accepted">{imageError}</Alert>}
      {analysisError && <Alert variant="error" title="Analysis failed">{analysisError}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card>
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-neutral-800">Select crop</span>
              <select
                value={crop}
                disabled={analyzing}
                onChange={(event) => {
                  setCrop(event.target.value as SupportedCrop);
                  setPrediction(null);
                  setAssessmentTime(null);
                }}
                className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                {CROPS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>

            <div className={[
              'rounded-lg p-3 text-sm',
              selectedModel?.available
                ? 'bg-primary-50 text-primary-800'
                : 'bg-neutral-50 text-neutral-600',
            ].join(' ')}>
              {selectedModel?.available
                ? `Ready · ${selectedModel.model_id}`
                : serviceError
                  ? 'Model availability could not be checked.'
                  : selectedModel?.error === 'model_file_missing'
                    ? 'This crop model is not installed on the inference service.'
                    : selectedModel?.error === 'tensorflow_runtime_unavailable'
                      ? 'The TensorFlow runtime is unavailable on the inference service.'
                      : selectedModel?.error === 'model_load_failed'
                        ? 'The crop model could not be loaded. Check the inference service logs.'
                        : 'Checking selected crop model…'}
            </div>

            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={analyzing}
              onChange={(event) => {
                chooseImage(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
            <input
              ref={cameraInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              disabled={analyzing}
              onChange={(event) => {
                chooseImage(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }}
            />

            {previewUrl ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Selected crop for assessment"
                  className="max-h-80 w-full rounded-xl border border-neutral-200 object-contain"
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" disabled={analyzing} onClick={() => fileInput.current?.click()} leftIcon={<ImagePlus className="h-4 w-4" />}>
                    Change image
                  </Button>
                  <Button variant="ghost" size="sm" disabled={analyzing} onClick={removeImage} leftIcon={<RotateCcw className="h-4 w-4" />}>
                    Remove image
                  </Button>
                </div>
                <p className="break-all text-xs text-neutral-500">
                  {image?.name} · {((image?.size ?? 0) / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-neutral-300 px-5 py-10 text-center">
                <Upload className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-neutral-800">Add a clear crop image</p>
                <p className="mt-1 text-xs text-neutral-500">JPEG, PNG, or WebP · up to 5 MB</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button size="sm" variant="secondary" disabled={analyzing} onClick={() => fileInput.current?.click()} leftIcon={<ImagePlus className="h-4 w-4" />}>
                    Choose image
                  </Button>
                  <Button size="sm" variant="secondary" disabled={analyzing} onClick={() => cameraInput.current?.click()} leftIcon={<Camera className="h-4 w-4" />}>
                    Use camera
                  </Button>
                </div>
              </div>
            )}

            <Button
              fullWidth
              onClick={analyze}
              isLoading={analyzing}
              disabled={!image || !selectedModel?.available}
              leftIcon={!analyzing ? <Stethoscope className="h-4 w-4" /> : undefined}
            >
              {analyzing ? 'Analyzing image…' : 'Analyze Crop'}
            </Button>
            {analyzing && (
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100" aria-label="Analysis in progress">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-primary-600" />
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          {!prediction && (
            <Card className="flex min-h-64 flex-col items-center justify-center text-center">
              <ShieldAlert className="h-10 w-10 text-neutral-300" aria-hidden />
              <h2 className="mt-3 font-semibold text-neutral-800">Your assessment will appear here</h2>
              <p className="mt-1 max-w-sm text-sm text-neutral-500">
                Select the matching crop and submit a clear image. A model score does not confirm
                disease or identify where symptoms are located.
              </p>
            </Card>
          )}

          {prediction && image && (
            <Card>
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {CROPS.find((item) => item.id === prediction.crop)?.label} · possible model label
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-neutral-900">
                      {prediction.predicted_class}
                    </h2>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    {prediction.uncertain ? 'Inconclusive' : 'Unverified'}
                  </span>
                </div>

                {prediction.uncertainty_reasons.length > 0 && (
                  <Alert variant="warning" title="This result is inconclusive">
                    {getUncertaintyMessage(prediction.uncertainty_reasons)}
                  </Alert>
                )}
                <p className="text-sm text-neutral-600">
                  {prediction.predicted_class.toLowerCase() === 'healthy'
                    ? 'The model selected its healthy class. This does not rule out a disease or other crop problem.'
                    : 'This is only the model’s top class label. The system does not confirm disease or locate visible symptoms.'}
                </p>

                <section>
                  <h3 className="mb-2 text-sm font-semibold text-neutral-800">Model scores</h3>
                  <div className="space-y-3">
                    {prediction.scores.map((score) => (
                      <div key={score.class_name}>
                        <div className="mb-1 flex justify-between gap-3 text-xs">
                          <span className="text-neutral-700">{score.class_name}</span>
                          <span className="font-semibold tabular-nums text-neutral-800">
                            {(score.score * 100).toFixed(1)}% model score
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-primary-600"
                            style={{ width: `${Math.min(100, Math.max(0, score.score * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="rounded-lg border border-neutral-200 p-4">
                  <h3 className="text-sm font-semibold text-neutral-800">Symptoms and indicators</h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    No symptom localization or independently verified visual explanation is produced.
                    Compare the plant with trusted local extension guidance; do not infer a treatment
                    from the class label alone.
                  </p>
                </div>

                <div className="rounded-lg border border-neutral-200 p-4">
                  <h3 className="text-sm font-semibold text-neutral-800">General precaution</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
                    <li>Take clear close-up and whole-plant photos and continue monitoring the crop.</li>
                    <li>Use clean planting material and follow local field-hygiene guidance.</li>
                    <li>Do not apply pesticides or change crop practices based only on this model output.</li>
                    <li>Ask a local agricultural extension officer or KVK to verify the issue and any management advice.</li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span>Model: {prediction.model_id}</span>
                  <span aria-hidden>·</span>
                  <span>Assessed: {formatDateTime(assessmentTime)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button disabled aria-describedby="report-saving-note">Save report</Button>
                  <Link
                    href={ROUTES.FARMER_WEATHER}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
                  >
                    <CloudSun className="h-4 w-4" aria-hidden />
                    Check farm weather
                  </Link>
                </div>
                <p id="report-saving-note" className="text-xs text-neutral-600">
                  Report saving is unavailable while persistent photo storage is disabled. This assessment is visible until you leave or reload this page.
                </p>
                <p className="flex items-start gap-2 text-xs text-neutral-500">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>Krishi Mitra chat and in-app expert requests are not available in the current repository. Please seek local expert verification before acting.</span>
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
