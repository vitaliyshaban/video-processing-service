import { FfmpegVideoResolution } from "./types";
// Firestore
export const videoCollectionId = "videos";
export const usersCollectionId = "users";

// Cloud Storage
export const rawVideoBucketName = "alesiafitness-firebase.appspot.com";
export const processedVideoBucketName = "alesiafitness-firebase-processed-video";

export const localRawVideoPath = "./raw-videos";
export const localProcessedVideoPath = "./processed-videos";

// FFmpeg
export const DEFAULT_VIDEO_RESOLUTION: FfmpegVideoResolution = "?x720";
