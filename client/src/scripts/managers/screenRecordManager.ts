import $ from "jquery";
import { GameConsole } from "../console/gameConsole";

class ScreenRecordManagerClass {
    mediaRecorder?: MediaRecorder;
    recording = false;
    startedTime = 0;
    videoData: Blob[] = [];
    readonly recordingPill = $("#recording-pill");
    readonly recordingTime = $("#recording-time");
    readonly recordingStopBtn = $("#stop-recording-button");

    private _initialized = false;
    init(): void {
        if (this._initialized) {
            throw new Error("ScreenRecordManager has already been initialized");
        }
        this._initialized = true;

        this.recordingStopBtn.on("click", () => this.endRecording());
    }

    async beginRecording(): Promise<void> {
        this.recording = true;
        const res = GameConsole.getBuiltInCVar("cv_record_res");
        this.mediaRecorder = new MediaRecorder(await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: {
                displaySurface: "browser",
                width: res === "maximum"
                    ? undefined
                    : {
                        ideal: {
                            "480p": 640,
                            "720p": 1280,
                            "1080p": 1920
                        }[res]
                    }
            },
            // @ts-expect-error @types/web does not have this yet
            preferCurrentTab: true,
            surfaceSwitching: "exclude"
        }));

        this.mediaRecorder.addEventListener("dataavailable", event => {
            this.videoData.push(event.data);
        });

        this.mediaRecorder.addEventListener("start", () => {
            this.startedTime = Date.now();
            this.videoData = [];
            this.recordingPill.css("display", "");
        });

        this.mediaRecorder.addEventListener("stop", () => {
            const blob = new Blob(this.videoData);
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);

            // ew
            const date = new Date();
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const day = date.getDay().toString().padStart(2, "0");
            const hours = date.getHours().toString().padStart(2, "0");
            const minutes = date.getMinutes().toString().padStart(2, "0");
            const seconds = date.getSeconds().toString().padStart(2, "0");
            link.download = `Suroi ${year}-${month}-${day} ${hours}-${minutes}-${seconds}.mp4`;

            link.click();
            this.recording = false;
            this.recordingPill.css("display", "none");
        });

        this.mediaRecorder?.start();
    }

    endRecording(): void {
        this.mediaRecorder?.stop();
        this.mediaRecorder = undefined;
    }

    update(): void {
        if (this.recording) {
            const duration = Date.now() - this.startedTime;
            this.recordingTime.text(`${Math.floor(duration / 60000)}:${(Math.floor(duration / 1000) % 60).toString().padStart(2, "0")}`);
        }
    }

    reset(): void {
        this.endRecording();
    }
}

export const ScreenRecordManager = new ScreenRecordManagerClass();
