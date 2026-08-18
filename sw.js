/**
 * Service worker minimo - so' existe para o Chrome/Edge oferecerem "Instalar
 * app" (criterio de instalabilidade exige um SW registrado com fetch). Nao
 * faz cache nem funciona offline de proposito: os dados vem do SharePoint via
 * login, entao nao faz sentido guardar nada aqui - so' repassa a requisicao.
 *
 * skipWaiting: assim que uma versao nova deste arquivo for publicada e o
 * navegador perceber a diferenca, ela assume na hora (sem esperar todas as
 * abas fecharem) - e' o que deixa app.js avisar "nova versao disponivel" de
 * verdade, em vez de ficar esperando indefinidamente.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('fetch', () => {});
