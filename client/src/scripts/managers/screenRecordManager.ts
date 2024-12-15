import type { Game } from "../game";

export type StreamMode
  = "canvas"
  | "navigator"

export class ScreenRecordManager {
  streamMode: StreamMode = "navigator";
  captureStream?: MediaStream;
  mediaRecorder?: MediaRecorder;
  videoData: Blob[] = [];
  videoSize: number = 0;
  startedTime: number = 0;
  recording = false;

  constructor(public game: Game) {}

  async init() {
    switch (this.streamMode) {
      case "canvas": {
        this.captureStream = this.game.pixi.canvas.captureStream(24);
        break;
      }
      case "navigator": {
        this.captureStream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: {
            displaySurface: "browser"
          },
          // @ts-expect-error @types/web does not have this yet
          preferCurrentTab: true,
          surfaceSwitching: "exclude"
        });
        break;
      }
    }
    this.mediaRecorder = new MediaRecorder(this.captureStream);

    this.mediaRecorder.addEventListener("dataavailable", (event) => {
      this.videoData.push(event.data);
      this.videoSize += event.data.size;
      console.log(`Video length: ${Date.now() - this.startedTime}ms`)
      console.log(`Video size: ${this.videoSize}bytes`)
    })

    this.mediaRecorder.addEventListener("stop", async (event) => {
      const blob = new Blob(this.videoData, { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank")
      this.videoData = [];
      this.videoSize = 0;
    });
  }

  beginRecording() {
    this.mediaRecorder?.start();
    this.startedTime = Date.now();
    this.recording = true;
  }

  endRecording() {
    this.mediaRecorder?.stop();
    this.recording = false;
  }
}