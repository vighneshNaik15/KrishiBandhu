'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Card, EmptyState } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/AuthContext';
import type { CropDiseaseAssessment } from '@/models/cropDiseaseAssessment';
import { cropDiseaseService } from '@/services/cropDiseaseService';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import { formatDateTime } from '@/utils/formatters';
import { ROUTES } from '@/lib/constants';

interface AssessmentWithImage extends CropDiseaseAssessment {
  imageUrl: string | null;
  imageError: boolean;
}

const CROP_NAMES: Record<CropDiseaseAssessment['selectedCrop'], string> = {
  rice: 'Rice',
  cotton: 'Cotton',
  maize: 'Maize',
  sugarcane: 'Sugarcane',
};

export function CropDiseaseHistoryPage() {
  const { userProfile } = useAuth();
  const farmerUid = userProfile?.uid ?? '';
  const [loadState, setLoadState] = useState<{
    farmerUid: string;
    assessments: AssessmentWithImage[];
    loading: boolean;
    error: string | null;
  }>({ farmerUid: '', assessments: [], loading: true, error: null });
  const isCurrentFarmer = loadState.farmerUid === farmerUid;
  const assessments = isCurrentFarmer ? loadState.assessments : [];
  const loading = !isCurrentFarmer || loadState.loading;
  const error = isCurrentFarmer ? loadState.error : null;

  useEffect(() => {
    if (!farmerUid) return;

    let active = true;
    const urls: string[] = [];
    cropDiseaseService.getByFarmer(farmerUid)
      .then(async (reports) => {
        const reportsWithImages = await Promise.all(reports.map(async (report) => {
          if (!report.imageStoragePath) return { ...report, imageUrl: null, imageError: false };
          try {
            const blob = await cropDiseaseService.getImage(report);
            if (!active) return { ...report, imageUrl: null, imageError: false };
            const imageUrl = URL.createObjectURL(blob);
            urls.push(imageUrl);
            return { ...report, imageUrl, imageError: false };
          } catch {
            return { ...report, imageUrl: null, imageError: true };
          }
        }));
        if (active) {
          setLoadState({
            farmerUid,
            assessments: reportsWithImages,
            loading: false,
            error: null,
          });
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setLoadState({
            farmerUid,
            assessments: [],
            loading: false,
            error: getFirebaseLoadErrorMessage(loadError, 'Saved assessment history'),
          });
        }
      });

    return () => {
      active = false;
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [farmerUid]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-3">
        <Link
          href={ROUTES.FARMER_CROP_DOCTOR}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          AI Crop Doctor
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900">Disease assessment history</h1>
          <p className="mt-1 text-sm text-neutral-600">Private reports saved to your farmer account.</p>
        </div>
      </header>

      {error ? (
        <Alert variant="error" title="History could not be loaded">{error}</Alert>
      ) : loading ? (
        <Card><p className="text-sm text-neutral-500">Loading your saved reports…</p></Card>
      ) : assessments.length === 0 ? (
        <Card>
          <EmptyState
            title="No saved reports"
            description="Choose Save report after analyzing a crop to see its prediction details here."
            action={
              <Link href={ROUTES.FARMER_CROP_DOCTOR} className="text-sm font-semibold text-primary-700">
                Start an assessment
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <Card key={assessment.assessmentId}>
              <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                {assessment.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={assessment.imageUrl}
                    alt={`${CROP_NAMES[assessment.selectedCrop]} assessment`}
                    className="h-40 w-full rounded-lg border border-neutral-200 object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                    <ImageOff className="h-7 w-7" aria-hidden />
                    <span className="sr-only">Image unavailable</span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        {CROP_NAMES[assessment.selectedCrop]} · {formatDateTime(assessment.assessedAt)}
                      </p>
                      <h2 className="mt-1 text-lg font-bold text-neutral-900">{assessment.predictedDisease}</h2>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      {assessment.status === 'uncertain' ? 'Inconclusive' : 'Unverified'}
                    </span>
                  </div>
                  {assessment.imageError && (
                    <p className="mt-2 text-xs text-red-700">The saved image is unavailable. The report details are still shown.</p>
                  )}
                  <p className="mt-2 text-sm text-neutral-600">
                    {(assessment.modelScore * 100).toFixed(1)}% top model score · {assessment.modelId}
                  </p>
                  <p className="mt-1 break-all text-xs text-neutral-400">Model version: {assessment.modelVersion}</p>
                  <ul className="mt-3 space-y-1 text-xs text-neutral-600">
                    {assessment.alternativeScores.map((score) => (
                      <li key={score.class_name}>
                        {score.class_name}: {(score.score * 100).toFixed(1)}% model score
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-neutral-500">
                    Model scores are not calibrated disease probabilities. Verify with an agricultural expert.
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
