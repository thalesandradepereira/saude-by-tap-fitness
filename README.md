# Saúde by TAP Fitness

**MVP 0.1 — PWA de entrevista pré-treino para Android, iOS e computadores.**

Um aplicativo web responsivo que coleta respostas de um check-in de bem-estar, **identifica sinais de alerta antes de qualquer recomendação**, e apresenta orientações conservadoras sobre um treino **já definido por um profissional de Educação Física**.

> **Status:** protótipo educativo/funcional. **Não homologado clinicamente, não apto à operação com dados reais de alunos.** Não diagnostica, não prescreve treino individualizado, não emite liberação para atividade física nem substitui avaliação médica/profissional.

## O que funciona agora

- Acesso por link, interface mobile-first, PWA instalável, inclusive modo offline após primeira visita HTTPS.
- Perfil temporário com apelido, modalidade de treino, duração programada, teto subjetivo de esforço informado, plano aprovado e confirmação de maioridade.
- Check-in com respostas explícitas para sete perguntas de segurança e quatro indicadores subjetivos de recuperação.
- Regras determinísticas com prioridade: **urgência → revisão → recuperação → redução conservadora → plano aprovado**.
- Orientações explicáveis, limites de RPE e tempo, sem progressão automática de carga.
- Fluxos de teste automatizados em Node.js, sem bibliotecas externas.
- Privacidade por padrão: as respostas e o apelido **não são gravados nem enviados** por este protótipo. Nenhum banco, tracking, analytics ou autenticação real.

## Começar localmente

Requisitos: Python 3 para servidor local; Node.js >= 20 para testes.

```bash
python3 -m http.server 8765
# abrir http://localhost:8765
```

```bash
npm test
```

Não abra diretamente `file://`: módulos ES e Service Worker precisam de servidor HTTP/HTTPS.

## Hospedagem GitHub Pages

1. Criar um repositório **público somente com código e arquivos de demonstração**. Nunca publicar dados de alunos ou tokens.
2. Subir todos os arquivos da raiz deste projeto.
3. No GitHub, abrir **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Selecionar a branch `main` e pasta `/(root)`, salvar e acompanhar a publicação.
5. O endereço geralmente terá o formato `https://SEU-USUARIO.github.io/saude-by-tap-fitness/` — **só considerar ativo após testar**.

GitHub Pages é hospedagem estática, sem banco e sem autenticação. A própria documentação do GitHub sinaliza restrições de uso para serviços comerciais do tipo SaaS. Este projeto foi limitado a um **piloto educacional**. Para o uso comercial em academias e alunos reais, avaliar migração de hospedagem e arquitetura adequadas.

## Cadastros / Google Drive

**Estado atual:** não há cadastro persistente ou sincronização entre dispositivos. Isso é intencional por envolver **dados pessoais sensíveis de saúde**.

**Não fazer:** guardar históricos em repositórios públicos, colocar token do Google Drive no JavaScript, ou expor Apps Script executado como proprietário a qualquer pessoa sem autenticação/autorização por usuário. Esses padrões podem expor registros privados de alunos.

**Arquitetura recomendada para fase de produção:** frontend PWA + Firebase Authentication + Firestore, com isolamento de tenant/academia, regras de acesso por pessoa e profissional autorizado, validação de claims no backend, auditoria, criptografia em trânsito/repouso, política de exclusão e base legal LGPD. O Google Drive pode receber **relatórios administrativos autorizados**, gerados a partir do backend, não ser o banco de dados clínicos direto do navegador. Ver [docs/ARQUITETURA.md](docs/ARQUITETURA.md) e [docs/PRIVACIDADE.md](docs/PRIVACIDADE.md).

## Lógica de prontidão

- **Urgente:** peito, dispneia importante/em repouso ou desmaio/quase desmaio → não treinar, procurar avaliação urgente; emergência quando sintomas atuais/intensos.
- **Revisão:** febre/infecção aguda, tontura, nova dor/lesão/restrição, ausência de plano aprovado, extremos de sono, energia ou dores → não seguir sugestão do aplicativo.
- **Programado:** apenas continua treino aprovado, com RPE sugerido até `min(RPE_aprovado, 6)`.
- **Reduzido:** sugere, **sujeito a acordo com professor**, reduzir tempo planejado em 30% e RPE sugerido até `min(RPE_aprovado, 4)`.
- **Recuperação:** desencoraja o treino programado e encaminha para o professor decidir descanso/alternativas.

A pontuação 0–100 é uma **heurística interna não validada**, não deve ser apresentada como índice médico/científico. Sinais de alerta ignoram a pontuação. Esforço subjetivo 0–10 e teste da fala são referências educativas, não liberam exercício.

**Importante sobre PAR-Q+:** este projeto *não replica nem modifica* o formulário oficial. A PAR-Q+ Collaboration proíbe incorporação em questionários eletrônicos sem autorização escrita. O aplicativo apenas fornece um link para a ferramenta oficial.

## Referências para revisão científica e jurídica

- CDC — [How to Measure Physical Activity Intensity](https://www.cdc.gov/physical-activity-basics/measuring/index.html) (atualizado em 04/12/2025): escala percebida 0–10 e teste da fala.
- PAR-Q+ Collaboration — [ferramentas oficiais](https://eparmedx.com/), [condições de uso](https://eparmedx.com/print-versions-of-par-q/).
- Brasil — [Lei Geral de Proteção de Dados, Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).
- GitHub — [Limites do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## QA e melhorias propostas

```bash
node --check js/engine.mjs
node --check js/app.mjs
npm test
```

Antes de qualquer piloto com pessoas reais, providenciar: revisão por médico do esporte/profissional de Educação Física, avaliação LGPD, consentimentos e base legal adequados, responsável por dados, testes de usabilidade, acessibilidade, validação dos limiares, protocolos de emergência, autorização dos alunos e controle de acesso.

**Roadmap:** autenticação e cadastro real; histórico privado; painel do professor; planos aprovados com versionamento; wearables com consentimento; integração com redes de academias; relatórios de eficácia e validação clínica.

---

**Saúde by TAP Fitness · Made by TAP**. Código disponibilizado para avaliação do protótipo; **nenhuma licença de reutilização ou redistribuição concedida por este repositório**.
