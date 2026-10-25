import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

export const DEFAULT_ALBUM = {
  title: "Nossa história em imagens",
  subtitle: "Um capítulo para guardar para sempre",
  themeColor: "#193d43",
  accentColor: "#c5a47e",
  font: "playfair",
  coverPhotoId: "",
};

export function isAlbumViewer(job, user) {
  if (!job || !user?.email) return false;
  const email = user.email.trim().toLowerCase();
  const recipient = String(job.clientEmail || "").trim().toLowerCase();
  // O link também pertence ao dono do trabalho, para conferência antes da entrega.
  return (recipient !== "" && email === recipient) || user.uid === job.photographerId;
}

export async function loadAlbumPhotos(jobId) {
  const snapshot = await getDocs(query(
    collection(db, "privateJobs", jobId, "deliveryPhotos"),
    orderBy("order", "asc")
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function saveAlbum(jobId, album, photos) {
  const batch = writeBatch(db);
  batch.update(doc(db, "privateJobs", jobId), {
    deliveryAlbum: album,
    updatedAt: serverTimestamp(),
  });
  photos.forEach((photo, index) => {
    batch.update(doc(db, "privateJobs", jobId, "deliveryPhotos", photo.id), {
      order: index,
      layout: photo.layout || "square",
      updatedAt: serverTimestamp(),
    });
  });
  // Firestore admite até 500 operações em um único lote.
  if (photos.length > 450) throw new Error("Este álbum ultrapassa o limite desta edição. Organize até 450 fotos por vez.");
  await batch.commit();
}

export async function publishAlbum(jobId, album, photos) {
  if (!photos.length) throw new Error("Envie pelo menos uma foto para entregar o álbum.");
  if (!album.coverPhotoId || !photos.some((p) => p.id === album.coverPhotoId)) {
    throw new Error("Escolha uma foto de capa antes de entregar.");
  }
  await saveAlbum(jobId, album, photos);
  await updateDoc(doc(db, "privateJobs", jobId), {
    deliveryPublished: true,
    deliveryPublishedAt: serverTimestamp(),
    status: "delivered",
    updatedAt: serverTimestamp(),
  });
}
