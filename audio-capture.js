/**
 * AudioCapture - マイク入力と音量解析を担当
 */
class AudioCapture {
    /**
     * @param {Object} callbacks
     * @param {Function} callbacks.onVolumeData - 音量データ受信時 (data: {rms, high, low})
     * @param {Function} callbacks.onStateChange - 状態変更時 (isRunning: boolean)
     * @param {Function} callbacks.onDevicesLoaded - デバイス一覧取得時 (devices: Array)
     * @param {Function} callbacks.onError - エラー発生時 (message: string)
     */
    constructor(callbacks = {}) {
        this.callbacks = callbacks;

        // 音声関連
        this.audioContext = null;
        this.micStream = null;
        this.workletNode = null;
        this.gainNode = null;

        // 設定
        this.hqAudioEnabled = false;
    }

    setHQAudioEnabled(enabled) {
        this.hqAudioEnabled = enabled;
    }

    async loadDevices() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop());

            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter((d) => d.kind === 'audioinput');

            const deviceList = audioInputs.map((device, i) => ({
                deviceId: device.deviceId,
                label: device.label || `マイク ${i + 1}`
            }));
            this.callbacks.onDevicesLoaded?.(deviceList);
        } catch (err) {
            console.error('マイクアクセスエラー:', err);
        }
    }

    async start(deviceId = null) {
        if (this.micStream) return;

        try {
            const baseAudio = {};
            if (deviceId) {
                baseAudio.deviceId = { exact: deviceId };
            }
            let audioConstraints = { ...baseAudio };
            if (this.hqAudioEnabled) {
                audioConstraints.echoCancellation = false;
                audioConstraints.noiseSuppression = false;
                audioConstraints.autoGainControl = false;
            }
            try {
                this.micStream = await navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints,
                });
            } catch (err) {
                if (this.hqAudioEnabled) {
                    console.warn(
                        'HQ Audio constraints failed, fallback to default:',
                        err
                    );
                    this.micStream = await navigator.mediaDevices.getUserMedia({
                        audio: baseAudio,
                    });
                } else {
                    throw err;
                }
            }

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (!this.audioContext.audioWorklet) {
                throw new Error('AudioWorklet未対応のブラウザです');
            }

            await this.audioContext.audioWorklet.addModule('audio-worklet.js');
            await this.audioContext.resume();

            const source = this.audioContext.createMediaStreamSource(this.micStream);
            this.workletNode = new AudioWorkletNode(this.audioContext, 'volume-analyzer');
            this.workletNode.port.onmessage = (event) => {
                this.callbacks.onVolumeData?.(event.data);
            };

            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 0;

            source.connect(this.workletNode);
            this.workletNode.connect(this.gainNode).connect(this.audioContext.destination);

            this.callbacks.onStateChange?.(true);

        } catch (err) {
            console.error('マイク開始エラー:', err);
            this.stop();
            this.callbacks.onError?.('マイクの開始に失敗しました: ' + err.message);
        }
    }

    stop() {
        if (this.workletNode) {
            try {
                this.workletNode.port.onmessage = null;
            } catch {
                // ignore
            }
            try {
                this.workletNode.disconnect();
            } catch {
                // ignore
            }
            this.workletNode = null;
        }

        if (this.gainNode) {
            try {
                this.gainNode.disconnect();
            } catch {
                // ignore
            }
            this.gainNode = null;
        }

        if (this.micStream) {
            this.micStream.getTracks().forEach((t) => t.stop());
            this.micStream = null;
        }

        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }

        this.callbacks.onStateChange?.(false);
    }

    isRunning() {
        return this.micStream !== null;
    }
}
