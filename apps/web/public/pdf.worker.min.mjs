if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers() {
    let resolve;
    let reject;

    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  };
}

if (typeof URL.parse !== 'function') {
  URL.parse = function parse(input, base) {
    try {
      return base ? new URL(input, base) : new URL(input);
    } catch {
      return null;
    }
  };
}

await import('/workers/pdf.worker.min.mjs?v=20260307');
