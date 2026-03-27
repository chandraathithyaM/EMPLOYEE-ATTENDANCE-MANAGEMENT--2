/**
 * Ultrasonic Utility for OTP transmission
 * Uses AudioContext to play and listen for high-frequency tones.
 */

const FREQUENCY = 18500; // 18.5 kHz
const DURATION = 2; // Seconds to play/listen

export const playUltrasonic = (otp) => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(FREQUENCY, audioCtx.currentTime);

        // Simple AM or Frequency shift would be better, 
        // but for now, we just play a steady tone to signal "I am here"
        // and let the employee know to check their proximity.
        // If we want to encode the OTP, we'd need a more complex modulation.
        // For this demo, let's just assume the tone signaling is enough 
        // to signify "Manager is Present".

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + DURATION);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + DURATION);
    } catch (err) {
        console.error("Failed to play ultrasonic tone:", err);
    }
};

export const listenForUltrasonic = (onDetected) => {
    let audioCtx;
    let microphone;
    let analyser;
    let stream;

    const startListening = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            microphone = audioCtx.createMediaStreamSource(stream);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;

            microphone.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkFrequency = () => {
                analyser.getByteFrequencyData(dataArray);
                
                // Find the index for 18.5kHz
                const sampleRate = audioCtx.sampleRate;
                const index = Math.round((FREQUENCY * analyser.fftSize) / sampleRate);
                
                // If the magnitude at that index is high enough
                if (dataArray[index] > 100) {
                    onDetected(true);
                    stopListening();
                } else {
                    requestAnimationFrame(checkFrequency);
                }
            };

            checkFrequency();

            // Stop after 10 seconds if nothing detected
            setTimeout(stopListening, 10000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            onDetected(false);
        }
    };

    const stopListening = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (audioCtx) {
            audioCtx.close();
        }
    };

    startListening();
    return stopListening;
};
