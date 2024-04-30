import { Request, Response } from "express";
import { isVideoNew, setVideo } from "../utils/firestore";
import {
    convertVideo,
    deleteProcessedVideo,
    deleteRawVideo,
    downloadRawVideo,
    uploadProcessedVideo
} from "./video-storage";

/**
 * Process a video file via Google Cloud Pub/Sub. This endpoint is triggered by a Google Cloud Pub/Sub message.
 *
 * Docs: https://cloud.google.com/run/docs/tutorials/pubsub#run_pubsub_server-nodejs
 */
export const processVideo = async (req: Request, res: Response) => {
    // get the bucket and filename from Google Cloud Pub/Sub message


    // validate the message
    //   if (!pubSubMessage || !pubSubMessage?.data) {
    //     return res
    //       .status(400)
    //       .json({ message: `Bad Request: missing Pub/Sub message or data` });
    //   }

    if (!req.body) {
        const msg = 'no Pub/Sub message received';
        console.error(`error: ${msg}`);
        res.status(400).send(`Bad Request: ${msg}`);
        return;
    }
    if (!req.body.message) {
        const msg = 'invalid Pub/Sub message format';
        console.error(`error: ${msg}`);
        res.status(400).send(`Bad Request: ${msg}`);
        return;
    }
    console.log(req.body);

    const pubSubMessage = req.body?.message;

    const message = Buffer.from(pubSubMessage?.data, "base64").toString().trim();

    try {
        JSON.parse(message);
    } catch (e) {
        res.status(204).send(`Bad Request: ${e}`);
        return;
    }
    const data = JSON.parse(message);
    console.log(data);
    //   try {
    //     console.log(pubSubMessage.data);
    //     const message = pubSubMessage.data ? Buffer.from(pubSubMessage?.data, "base64").toString().trim() : '{"name": "0qSnXrOH0MZpcUIs7ric8nUWYvh2-1714491477956.mp4"}';
    //     data = JSON.parse(message);

    //     if (!data?.name) {
    //       throw new Error("Bad Request: Invalid message payload received");
    //     }
    //   } catch (err) {
    //     console.log(err);

    //     return res.status(400).json({ message: `Bad Request: missing filename` });
    //   }

    // get the filename from the message
    const inputFileName = data.name; // <UID>-<DATE>.EXT
    const outputFileName = `processed-${inputFileName}`;

    // video metadata
    const videoId = inputFileName.split(".")[0];
    const uid = videoId.split("-")[0];

    // make sure the video is new
    if (await isVideoNew(videoId)) {
        await setVideo(videoId, { id: videoId, uid, status: "processing" });
    } else {
        return res
            .status(400)
            .json({ message: `Bad Request: Video already processed or processing` });
    }

    // download video
    await downloadRawVideo(inputFileName);

    // convert video
    try {
        await convertVideo(inputFileName, outputFileName);
    } catch (err) {
        console.log(`Error converting video at ${inputFileName}: ${err}`);

        // update video status
        await setVideo(videoId, { status: "failed" });

        // cleanup
        await Promise.all([
            deleteRawVideo(inputFileName),
            deleteProcessedVideo(outputFileName)
        ]);

        return res
            .status(500)
            .json({ message: `Internal Server Error: video processing failed` });
    }

    // upload video
    await uploadProcessedVideo(outputFileName);

    // update video status
    await setVideo(videoId, { status: "processed", filename: outputFileName });

    // cleanup
    await Promise.all([
        deleteRawVideo(inputFileName),
        deleteProcessedVideo(outputFileName)
    ]);

    return res.status(204).json({ message: `Video processed successfully` });
};
