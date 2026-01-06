/**
 * Audio utility functions for attendance feedback
 * Uses Web Audio API to generate beep sounds
 */

/**
 * Play a success beep sound
 */
export const playSuccessBeep = () => {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator for beep
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure beep
    oscillator.frequency.value = 800; // Higher pitch for success
    oscillator.type = 'sine';
    
    // Volume envelope
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    // Play beep
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn('Could not play success beep:', error);
  }
};

/**
 * Play an error/alert sound
 */
export const playErrorAlert = () => {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator for alert
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure alert (lower pitch, longer duration)
    oscillator.frequency.value = 400; // Lower pitch for error
    oscillator.type = 'sawtooth';
    
    // Volume envelope
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    // Play alert
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (error) {
    console.warn('Could not play error alert:', error);
  }
};

