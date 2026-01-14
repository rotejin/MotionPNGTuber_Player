class VolumeAnalyzerProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.lowState = 0;
        this.rmsSum = 0;
        this.lowEnergy = 0;
        this.highEnergy = 0;
        this.sampleCount = 0;
        this.reportSamples = Math.max(1, Math.floor(sampleRate / 60));
        this.lowAlpha = 1 - Math.exp((-2 * Math.PI * 700) / sampleRate);
    }

    process(inputs) {
        const input = inputs[0];
        if (!input || input.length === 0) return true;

        const channel = input[0];
        for (let i = 0; i < channel.length; i++) {
            const x = channel[i];
            const low = this.lowState + this.lowAlpha * (x - this.lowState);
            this.lowState = low;
            const high = x - low;

            this.rmsSum += x * x;
            this.lowEnergy += low * low;
            this.highEnergy += high * high;
            this.sampleCount += 1;

            if (this.sampleCount >= this.reportSamples) {
                const samples = this.sampleCount;
                const rms = Math.sqrt(this.rmsSum / samples);
                const lowEnergy = this.lowEnergy / samples;
                const highEnergy = this.highEnergy / samples;
                this.port.postMessage({ rms, low: lowEnergy, high: highEnergy });

                this.sampleCount = 0;
                this.rmsSum = 0;
                this.lowEnergy = 0;
                this.highEnergy = 0;
            }
        }

        return true;
    }
}

registerProcessor('volume-analyzer', VolumeAnalyzerProcessor);
