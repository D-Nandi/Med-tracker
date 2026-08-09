// ============================================================
// firebase/storage.js — File upload / download / delete
// ============================================================

import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import { storage } from "./init.js";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE_MB   = 10;

// ── Validate file before upload ────────────────────────────────
export function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only PDF, JPG, PNG files are allowed.");
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File size must be under ${MAX_SIZE_MB}MB.`);
  }
  return true;
}

// ── Upload a medical report ────────────────────────────────────
// onProgress(percent) is called during upload
export function uploadReport(file, patientId, onProgress) {
  return new Promise((resolve, reject) => {
    validateFile(file);

    const ext       = file.name.split(".").pop();
    const fileName  = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, `reports/${patientId}/${fileName}`);

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type
    });

    uploadTask.on(
      "state_changed",
      snapshot => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      },
      reject,
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ url, path: storageRef.fullPath, name: file.name });
      }
    );
  });
}

// ── Upload a prescription (e.g., image scan) ──────────────────
export function uploadPrescriptionScan(file, patientId, onProgress) {
  return new Promise((resolve, reject) => {
    validateFile(file);

    const ext      = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const storageRef = ref(storage, `prescriptions/${patientId}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

    uploadTask.on("state_changed",
      snap => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      },
      reject,
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ url, path: storageRef.fullPath, name: file.name });
      }
    );
  });
}

// ── Delete a file by its storage path ─────────────────────────
export async function deleteFile(storagePath) {
  const fileRef = ref(storage, storagePath);
  await deleteObject(fileRef);
}

// ── Get download URL from path ─────────────────────────────────
export async function getFileUrl(storagePath) {
  const fileRef = ref(storage, storagePath);
  return getDownloadURL(fileRef);
}
