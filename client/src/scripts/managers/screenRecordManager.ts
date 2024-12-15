import type { Game } from "../game";

export type StreamMode
  = "canvas"
  | "navigator"

export class ScreenRecordManager {
  streamMode: StreamMode;
  captureStream?: MediaStream;
  mediaRecorder?: MediaRecorder;
  videoData: Blob[] = [];
  videoSize: number = 0;
  startedTime: number = 0;
  recording = false;
  initialized = false;

  constructor(public game: Game) {
    this.streamMode = game.console.getBuiltInCVar("cv_record_mode");
    console.log(this.streamMode)
  }

  async init() {
    this.initialized = true;
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
    });

    this.mediaRecorder.addEventListener("start", () => {
      this.videoData = [];
      this.videoSize = 0;
      this.recording = true;
      this.startedTime = Date.now();
      console.log("Begin recording video")
    })

    this.mediaRecorder.addEventListener("stop", async (event) => {
      const blob = new Blob(this.videoData, { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      this.recording = false;
      console.log(`Video length: ${Date.now() - this.startedTime}ms`)
      console.log(`Video size: ${this.videoSize}bytes`)
    });
  }

  async beginRecording() {
    if (!this.initialized) await this.init();
    this.mediaRecorder?.start();
  }

  endRecording() {
    this.mediaRecorder?.stop();
  }
}