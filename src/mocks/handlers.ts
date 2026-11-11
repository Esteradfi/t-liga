import { delay, http, HttpResponse } from 'msw';
import { getResource, mutateResource, ServiceError } from './service';
async function respond(request: Request, run: () => unknown) {
  await delay(120);
  try {
    if (new URL(request.url).searchParams.has('mockError'))
      return HttpResponse.json(
        {
          code: 'DEMO_ERROR',
          message: 'Демонстрационная ошибка сети. Убери ?mockError=1 и повтори.',
        },
        { status: 503 },
      );
    return HttpResponse.json(JSON.parse(JSON.stringify(run())));
  } catch (e) {
    if (e instanceof ServiceError)
      return HttpResponse.json({ code: e.code, message: e.message }, { status: e.status });
    return HttpResponse.json(
      { code: 'VALIDATION', message: 'Проверь переданные данные.' },
      { status: 400 },
    );
  }
}
export const handlers = [
  http.get('/api/:resource', ({ request, params }) =>
    respond(request, () => getResource(String(params.resource), new URL(request.url).searchParams)),
  ),
  http.post('/api/:action', async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return respond(request, () => mutateResource(String(params.action), body));
  }),
];
