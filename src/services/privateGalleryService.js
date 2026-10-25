import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "./firebase";

export async function publishPrivateGallery(
  jobId
) {
  const photosRef = collection(
    db,
    "privateJobs",
    jobId,
    "photos"
  );

  const snapshot =
    await getDocs(photosRef);

  if (snapshot.empty) {
    throw new Error(
      "Adicione pelo menos uma foto antes de publicar."
    );
  }

  const batch =
    writeBatch(db);

  snapshot.docs.forEach(
    (photoDocument) => {
      const photo =
        photoDocument.data();

      /*
        Fotos antigas que não possuem
        preview ainda não podem entrar
        na galeria do cliente.
      */

      if (!photo.previewStoragePath) {
        return;
      }

      const proofRef = doc(
        db,
        "privateJobs",
        jobId,
        "proofs",
        photoDocument.id
      );

      batch.set(
        proofRef,
        {
          photoId:
            photoDocument.id,

          fileName:
            photo.fileName,

          originalFileName:
            photo.originalFileName || photo.fileName,

          previewStoragePath:
            photo.previewStoragePath,

          previewWidth:
            photo.previewWidth || null,

          previewHeight:
            photo.previewHeight || null,

          selected: false,

          clientNote: "",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );
    }
  );

  await batch.commit();

  const jobRef = doc(
    db,
    "privateJobs",
    jobId
  );

  await updateDoc(
    jobRef,
    {
      galleryPublished: true,

      galleryPublishedAt:
        serverTimestamp(),

      status:
        "awaiting_selection",

      selectionStatus:
        "not_started",

      updatedAt:
        serverTimestamp(),
    }
  );
}