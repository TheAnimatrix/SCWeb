import { writable } from 'svelte/store';

interface ToastState {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  visible: boolean;
  duration: number; // Duration in ms
}

const initialToastState: ToastState = {
  message: '',
  type: 'info',
  visible: false,
  duration: 4000, // Default duration
};

const { subscribe, set, update } = writable<ToastState>(initialToastState);

let timeoutId: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string, type: ToastState['type'] = 'info', duration?: number) {
  if (timeoutId) {
    clearTimeout(timeoutId); // Clear previous timeout if a new toast is shown quickly
  }

  const toastDuration = duration ?? initialToastState.duration;

  update(state => ({
    ...state,
    message,
    type,
    visible: true,
    duration: toastDuration,
  }));

  timeoutId = setTimeout(() => {
    hideToast();
  }, toastDuration);
}

function hideToast() {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  update(state => ({ ...state, visible: false }));
  // Reset message/type after hiding transition (if any) or immediately
  // setTimeout(() => set(initialToastState), 500); // Example delay for transition
  set(initialToastState); // Reset immediately for simplicity now
}

export const toastStore = {
  subscribe,
  show: showToast,
  hide: hideToast,
};