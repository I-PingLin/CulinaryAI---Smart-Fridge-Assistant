
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private synth = window.speechSynthesis;
  isSpeaking = signal(false);

  speak(text: string) {
    this.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => this.isSpeaking.set(false);
    this.synth.speak(utterance);
  }

  cancel() {
    this.synth.cancel();
    this.isSpeaking.set(false);
  }
}
