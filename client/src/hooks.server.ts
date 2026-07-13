import type { Handle } from "@sveltejs/kit";
import { getTextDirection } from "$lib/paraglide/runtime";
import { paraglideMiddleware } from "$lib/paraglide/server";

export const handleError = ({ error }) => {
  console.error("SvelteKit error:", error);

  return { message: "text" in error ? error.text : "Internal Error" };
};

const handleParaglide: Handle = ({ event, resolve }) => paraglideMiddleware(event.request, ({ request, locale }) => {
  event.request = request;

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace("%paraglide.lang%", locale).replace("%paraglide.dir%", getTextDirection(locale))
  });
});

export const handle: Handle = handleParaglide;
