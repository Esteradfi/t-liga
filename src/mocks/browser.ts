import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);

if (import.meta.hot) {
  import.meta.hot.accept('./handlers', (module) => {
    if (module) worker.resetHandlers(...module.handlers);
  });
}
