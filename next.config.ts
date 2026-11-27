import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { parseCropDoctorUrl } from "./src/lib/cropDoctorUrl";

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD && process.env.VERCEL === '1') {
    const required = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
    ];
    const missing = required.filter(name => !process.env[name]?.trim());
    if (missing.length) throw new Error(`Missing Firebase web configuration: ${missing.join(', ')}`);

    if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === '1' ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'demo-krishibandhu') {
      throw new Error('Configure a real Firebase project and disable the emulator flag for Vercel.');
    }

    const cropDoctorUrl = process.env.NEXT_PUBLIC_CROP_DOCTOR_API_URL?.trim();
    if (cropDoctorUrl && !parseCropDoctorUrl(cropDoctorUrl)) {
      throw new Error('Set NEXT_PUBLIC_CROP_DOCTOR_API_URL to the hosted HTTPS inference service or leave it unset.');
    }
  }
  return {};
}
