import React, { useState, useEffect } from 'react';
import { X, Delete, CheckCircle } from 'lucide-react';

interface DoorlockModalProps {
    initialValue: string;
    onClose: () => void;
    onComplete: (value: string) => void;
}

const DoorlockModal: React.FC<DoorlockModalProps> = ({ initialValue, onClose, onComplete }) => {
    const [input, setInput] = useState(initialValue);
    const [isOpening, setIsOpening] = useState(false);
    const [displayMessage, setDisplayMessage] = useState<string | null>(null);
    const audioCtxRef = React.useRef<AudioContext | null>(null);

    // Initialize Audio Context on user interaction (safe)
    const initAudio = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    const playTone = (freq: number, type: OscillatorType = 'sine', duration: number = 0.08) => {
        initAudio();
        if (!audioCtxRef.current) return;

        const oscillator = audioCtxRef.current.createOscillator();
        const gainNode = audioCtxRef.current.createGain();

        oscillator.type = type;
        oscillator.frequency.value = freq;

        oscillator.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);

        oscillator.start();

        // Quick fade out to avoid popping
        gainNode.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + duration);

        oscillator.stop(audioCtxRef.current.currentTime + duration);
    };

    const playSuccessSound = () => {
        // "OPEN" melody - standard electronic "Dididit"
        setTimeout(() => playTone(1500, 'sine', 0.1), 0);
        setTimeout(() => playTone(1500, 'sine', 0.1), 120);
        setTimeout(() => playTone(2000, 'sine', 0.2), 240);
    };

    // Standard electronic beep frequencies (Monotone for digits)
    const toneMap: { [key: string]: number } = {
        '1': 1800, '2': 1800, '3': 1800,
        '4': 1800, '5': 1800, '6': 1800,
        '7': 1800, '8': 1800, '9': 1800,
        '0': 1800,
        '*': 1600,  // Slightly lower/different for function keys
        '#': 1600
    };

    const handlePress = (key: string) => {
        if (input.length >= 10) return;

        // Short, sharp vibration for "premium" feel (iPhone-like haptic)
        // Note: iOS Safari only vibrates on specific elements (e.g., input, button) and often requires user interaction.
        // Android Chrome generally supports navigator.vibrate more broadly.
        if (navigator.vibrate) navigator.vibrate(5);
        if (toneMap[key]) playTone(toneMap[key]);

        setInput(prev => prev + key);
    };

    const handleDelete = () => {
        if (navigator.vibrate) navigator.vibrate(8);
        playTone(300, 'square', 0.1); // Low buzz for delete
        setInput(prev => prev.slice(0, -1));
    };

    const handleConfirm = () => {
        if (input.length === 0) {
            playTone(200, 'sawtooth', 0.2); // Error buzz
            onClose();
            return;
        }

        // Simulate Doorlock Opening Sequence
        setIsOpening(true);
        setDisplayMessage("OPEN");
        // "Mechanical" unlock feel: Tick - Wait - Tick
        if (navigator.vibrate) navigator.vibrate([15, 60, 15]);
        playSuccessSound();

        setTimeout(() => {
            onComplete(input);
        }, 800);
    };

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; }
    }, []);

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-[320px] bg-gray-900 rounded-3xl p-4 shadow-2xl border-4 border-gray-700 relative scale-100 transition-transform duration-200 mb-[15vh]">

                {/* Close Button */}
                <button onClick={onClose} className="absolute -top-10 right-0 text-white/80 p-2 hover:bg-white/10 rounded-full">
                    <X className="w-6 h-6" />
                </button>

                {/* Brand / Header */}
                <div className="text-center mb-2">
                    <h3 className="text-gray-400 text-[10px] font-bold tracking-[0.2em]">DIGITAL LOCK</h3>
                </div>

                {/* 8-Segment Display Area */}
                <div className="bg-black border-2 border-gray-600 rounded-lg p-2 mb-3 relative h-14 flex items-center justify-end overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,1)] px-3">
                    <div className={`font-mono text-3xl tracking-[0.2em] ${displayMessage === "OPEN" ? "text-blue-400 animate-pulse" : "text-green-500"
                        } drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] flex items-baseline justify-end w-full leading-none`} style={{ fontFamily: 'Courier New, monospace' }}>
                        {displayMessage ? (
                            <span className="w-full text-center">{displayMessage}</span>
                        ) : (
                            <>
                                {/* Rest of the string */}
                                <span>{input.slice(0, -1)}</span>

                                {/* Active Character Slot with Underline Cursor */}
                                {/* Using inline-flex justify-center ensures strict horizontal centering */}
                                <span className="relative inline-flex justify-center w-[0.8em] ml-[0.1em]">
                                    {input.slice(-1) || "\u00A0"}
                                    {/* The Cursor (Underline) */}
                                    <span className="absolute w-[70%] left-[3%] bottom-1 h-[2px] bg-green-500/80 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {keys.map((key) => (
                        <button
                            key={key}
                            onClick={() => handlePress(key)}
                            disabled={isOpening}
                            className="bg-gray-800 active:bg-gray-700 active:scale-95 transition-all h-10 rounded-lg flex items-center justify-center border-b-[3px] border-gray-950 text-white font-bold text-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {key}
                        </button>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-1.5">
                    <button
                        onClick={handleDelete}
                        disabled={isOpening}
                        className="bg-gray-700 active:bg-gray-600 h-10 rounded-lg flex items-center justify-center text-red-400 font-bold border-b-[3px] border-gray-950 active:scale-95 transition-all"
                    >
                        <Delete className="w-4 h-4 mr-1" />
                        <span className="text-xs">지움</span>
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isOpening}
                        className={`h-10 rounded-lg flex items-center justify-center font-bold active:scale-95 transition-all text-white shadow-lg ${input.length > 0 ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/50' : 'bg-gray-700 text-gray-400'}`}
                    >
                        {isOpening ? <CheckCircle className="w-4 h-4 animate-ping" /> : <span className="text-xs">입력완료</span>}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DoorlockModal;
