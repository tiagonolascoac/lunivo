import {
  httpsCallable,
} from "firebase/functions";

import {
  functions,
} from "./firebase";

export async function prepareSelectedZip(
  jobId
) {
  const callable =
    httpsCallable(
      functions,
      "prepareSelectedPhotosZip"
    );

  const response =
    await callable({
      jobId,
    });

  return response.data;
}

export async function getSelectedZipDownloadUrl(
  jobId
) {
  const callable =
    httpsCallable(
      functions,
      "getSelectedZipDownloadUrl"
    );

  const response =
    await callable({
      jobId,
    });

  return response.data;
}