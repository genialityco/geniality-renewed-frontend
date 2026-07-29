import { UNSAFE_createBrowserHistory } from "react-router-dom";

type BrowserHistory = ReturnType<typeof UNSAFE_createBrowserHistory>;
type To = Parameters<BrowserHistory["push"]>[0];

/**
 * Adaptador de historial para dominios white-label (ver src/config/customDomains.ts).
 *
 * Problema: toda la app (rutas, guards, navegaciones, useParams) trabaja con
 * rutas del tipo `/organization/<orgId>/...`. En un dominio de marca queremos
 * que la barra de direcciones muestre rutas limpias (`/`, `/course/x`, `/admin`)
 * sin ese prefijo, pero SIN reescribir todo el código.
 *
 * Solución: envolver el history del navegador y traducir en un único punto:
 *  - Navegador → router: a la ruta limpia se le antepone el prefijo de la org,
 *    de modo que el router hace match como siempre (`/organization/<id>/...`).
 *  - Router → navegador: al escribir/crear enlaces se le quita el prefijo, así
 *    la URL visible queda limpia.
 *
 * Las rutas de OTRAS organizaciones (`/organization/<otroId>/...`) pasan sin
 * tocar, por si un usuario navega fuera de la org dueña del dominio.
 */
export function createBrandedHistory(orgId: string): BrowserHistory {
  const base = `/organization/${orgId}`;
  const browserHistory = UNSAFE_createBrowserHistory();

  // Ruta interna del router → ruta limpia del navegador.
  const toBrowserPath = (pathname: string): string => {
    if (pathname === base) return "/";
    if (pathname.startsWith(base + "/")) return pathname.slice(base.length);
    return pathname; // otras orgs u otras rutas: sin cambios
  };

  // Ruta limpia del navegador → ruta interna del router.
  const toRouterPath = (pathname: string): string => {
    if (pathname.startsWith("/organization/")) return pathname; // ya prefijada u otra org
    if (pathname === "/") return base;
    return base + pathname;
  };

  // Aplica un mapeo de pathname a un `To` (string o Path parcial), preservando
  // search/hash.
  const mapTo = (to: To, mapPath: (p: string) => string): To => {
    if (typeof to === "string") {
      const match = to.match(/^([^?#]*)(.*)$/);
      const pathname = match ? match[1] : to;
      const rest = match ? match[2] : "";
      return mapPath(pathname) + rest;
    }
    return { ...to, pathname: to.pathname ? mapPath(to.pathname) : to.pathname };
  };

  const wrapLocation = (loc: BrowserHistory["location"]): BrowserHistory["location"] => ({
    ...loc,
    pathname: toRouterPath(loc.pathname),
  });

  return {
    get action() {
      return browserHistory.action;
    },
    get location() {
      return wrapLocation(browserHistory.location);
    },
    createHref(to: To) {
      return browserHistory.createHref(mapTo(to, toBrowserPath));
    },
    encodeLocation(to: To) {
      // Codifica en espacio del navegador y vuelve a prefijar el pathname para
      // que el router siga viendo la ruta interna.
      const encoded = browserHistory.encodeLocation(mapTo(to, toBrowserPath));
      return { ...encoded, pathname: toRouterPath(encoded.pathname) };
    },
    push(to: To, state?: any) {
      browserHistory.push(mapTo(to, toBrowserPath), state);
    },
    replace(to: To, state?: any) {
      browserHistory.replace(mapTo(to, toBrowserPath), state);
    },
    go(delta: number) {
      browserHistory.go(delta);
    },
    listen(listener) {
      return browserHistory.listen((update) =>
        listener({ ...update, location: wrapLocation(update.location) })
      );
    },
  } as BrowserHistory;
}
