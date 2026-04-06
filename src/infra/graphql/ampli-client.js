/**
 * @file src/infra/graphql/ampli-client.js
 * @description Cliente GraphQL autenticado para a API da Ampli.
 *              Única responsabilidade: enviar requisições e parsear respostas.
 *              Não conhece lógica de negócio — é infraestrutura pura.
 */

'use strict';

const AmpliClient = (() => {
  /**
   * Envia uma query/mutation GraphQL autenticada.
   *
   * @param {string}  query       - Query ou mutation GraphQL
   * @param {Object}  [variables] - Variáveis da operação
   * @param {string}  [token]     - Bearer token (padrão: Store)
   * @returns {Promise<Object>}   - Dados da resposta (json.data)
   * @throws {Error} se HTTP ≠ 2xx ou resposta contiver `errors`
   */
  async function query(query, variables, token) {
    const authToken = token ?? Store.get('sessionToken');

    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(variables ? { query, variables } : { query }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();

    if (json?.errors?.length) {
      throw new Error(json.errors.map(e => e.message).join('; '));
    }

    return json?.data ?? null;
  }

  /**
   * Versão do query() com rate limiting aplicado automaticamente.
   * Use este para todas as chamadas do fluxo de marcação de aulas,
   * que são sujeitas ao limite de 429 da Ampli.
   */
  async function ratedQuery(queryStr, variables, token) {
    return RateLimiter.schedule(() => query(queryStr, variables, token));
  }

  return { query, ratedQuery };
})();

// ─── Compat alias ─────────────────────────────────────────────────────────────
// Mantém compatibilidade com chamadas diretas de gqlFetch() nos módulos antigos.
async function gqlFetch(queryStr, variables, token) {
  return AmpliClient.query(queryStr, variables, token);
}
