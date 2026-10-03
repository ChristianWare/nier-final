// The loading bar's on/off switch. Anything that starts loading a page calls
// start(); the bar finishes when done() is called or the URL changes.

type Listener = (active: boolean) => void;

let active = false;
const listeners = new Set<Listener>();

export const navProgress = {
  start() {
    if (active) return;
    active = true;
    listeners.forEach((l) => l(true));
  },
  done() {
    if (!active) return;
    active = false;
    listeners.forEach((l) => l(false));
  },
  isActive() {
    return active;
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
