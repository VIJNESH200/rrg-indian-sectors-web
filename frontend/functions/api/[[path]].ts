import workerHandler from "../../../worker/src/index.js";

export async function onRequest(context: any) {
  const { request, env } = context;
  return workerHandler.fetch(request, env, context);
}
