/**
 * Service worker minimo - so' existe para o Chrome/Edge oferecerem "Instalar
 * app" (criterio de instalabilidade exige um SW registrado com fetch). Nao
 * faz cache nem funciona offline de proposito: os dados vem do SharePoint via
 * login, entao nao faz sentido guardar nada aqui - so' repassa a requisicao.
 */
self.addEventListener('fetch', () => {});
