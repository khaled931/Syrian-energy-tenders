import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function normalizePrivateKey(value?: string) {
  return value?.replace(/\\n/g, "\n").trim();
}

function parseServiceAccountJson(raw: string): ServiceAccount | null {
  const candidates = [raw];

  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    if (decoded.trim().startsWith("{")) candidates.push(decoded);
  } catch {
    // Keep the plain JSON candidate only.
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        project_id?: string;
        projectId?: string;
        client_email?: string;
        clientEmail?: string;
        private_key?: string;
        privateKey?: string;
      };

      const publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
      const projectId = publicProjectId || parsed.project_id?.trim() || parsed.projectId?.trim();
      const clientEmail = parsed.client_email?.trim() || parsed.clientEmail?.trim();
      const privateKey = normalizePrivateKey(parsed.private_key || parsed.privateKey);

      if (projectId && clientEmail && privateKey) {
        return { projectId, clientEmail, privateKey };
      }
    } catch {
      // Try the next supported representation.
    }
  }

  return null;
}

function fromJsonVariable(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  return raw ? parseServiceAccountJson(raw) : null;
}

function fromIndividualVariables(): ServiceAccount | null {
  const projectId = (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID
  )?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

function serviceAccount() {
  return fromJsonVariable() || fromIndividualVariables();
}

export function isFirebaseAdminConfigured() {
  return Boolean(serviceAccount());
}

export function getAdminDb() {
  const account = serviceAccount();
  if (!account) {
    throw new Error(
      "Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY with a Firebase project ID.",
    );
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(account), projectId: account.projectId });
  }

  return getFirestore();
}
