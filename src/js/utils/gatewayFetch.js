// Same signature as fetch, but keeps at most MAX_CONCURRENT geo-dash gateway requests in flight.

const MAX_CONCURRENT = 15;

const store = { current: { active: 0, queue: [] } };

const enqueue = (entry) => (state) => ({ ...state, queue: [...state.queue, entry] });

const dequeue = (entry) => (state) => ({
  ...state,
  queue: state.queue.filter((queued) => queued !== entry),
});

const finish = (state) => ({ ...state, active: state.active - 1 });

const drain = (state) => {
  const free = Math.max(MAX_CONCURRENT - state.active, 0);
  const started = state.queue.slice(0, free);
  return {
    started,
    state: { active: state.active + started.length, queue: state.queue.slice(free) },
  };
};

const abortReason = (signal) =>
  signal.reason ?? new DOMException("The request was aborted.", "AbortError");

const dispatch = (transition) => {
  const { started, state } = drain(transition(store.current));
  store.current = state;
  started.forEach(run);
};

const run = ({ url, options, resolve }) => {
  const request = Promise.resolve().then(() => fetch(url, options));
  resolve(request);
  request.then(() => dispatch(finish), () => dispatch(finish));
};

export const gatewayFetch = (url, options) =>
  new Promise((resolve, reject) => {
    const signal = options?.signal;
    const entry = { url, options, resolve };
    const onAbort = () =>
      store.current.queue.includes(entry) &&
      (dispatch(dequeue(entry)), reject(abortReason(signal)));
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    dispatch(enqueue(entry));
  });
