/**
 * Adaptador LOCAL: os dados vivem no navegador de quem abriu o app.
 *
 * E' o modo usado enquanto o registro no Azure AD nao existe. Serve para validar
 * a tela, mas nao atende multiplos usuarios - cada pessoa tem a propria copia,
 * que e' exatamente a limitacao do Excel compartilhado de hoje. O app deixa isso
 * visivel numa faixa de aviso, para ninguem confundir com o modo SharePoint.
 */

import { CONFIG } from '../config.js';
import { lerArquivo, gerarArquivo, baixar } from './planilha.js';

const CHAVE = 'auditoria_integracao::registros';

export class FonteLocal {
  constructor() {
    this.nome = 'Modo local (este navegador)';
    this.centralizada = false;
    this.pastaOriginal = null;
    this.registros = [];
  }

  async iniciar() {
    try {
      const bruto = localStorage.getItem(CHAVE);
      this.registros = bruto ? JSON.parse(bruto) : [];
    } catch {
      this.registros = [];  // storage corrompido nao pode impedir o app de abrir
    }
    return { conectado: true, usuario: null };
  }

  async carregar() {
    return this.registros;
  }

  /** Grava o conjunto inteiro; o volume (centenas de linhas) cabe sem problema. */
  async salvar(registros) {
    this.registros = registros;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(registros));
    } catch {
      throw new Error('O armazenamento do navegador está cheio. Exporte a planilha para não perder o trabalho.');
    }
  }

  async importar(arquivo) {
    const { registros, pastaOriginal } = await lerArquivo(arquivo, CONFIG.planilha.aba);
    this.pastaOriginal = pastaOriginal;
    await this.salvar(registros);
    return registros;
  }

  async exportar(registros) {
    const dados = await gerarArquivo(registros, CONFIG.planilha.aba, this.pastaOriginal);
    const hoje = new Date().toISOString().slice(0, 10);
    baixar(dados, `Painel_Controle_Integracao_${hoje}.xlsx`);
  }
}
