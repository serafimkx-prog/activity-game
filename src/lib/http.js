export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function error(message, status = 400, details = null) {
  return json(
    {
      ok: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

export function methodNotAllowed(request, allowedMethods) {
  const methods = Array.isArray(allowedMethods) ? allowedMethods : [allowedMethods];
  if (methods.includes(request.method)) return null;

  return error(`Method ${request.method} not allowed`, 405, {
    allow: methods,
  });
}
