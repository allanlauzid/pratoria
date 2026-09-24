/** Endereço público do app (GitHub Pages ou onde estiver rodando). */
export const urlDoSite = () => new URL(import.meta.env.BASE_URL, location.origin).href;
