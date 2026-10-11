# Privacidade e uso responsável — protótipo 0.2

## Quais dados este protótipo solicita?

- Apelido sem identificação obrigatória, modalidade de treino, tempo e limite de esforço informado.
- Declaração de maioridade e existência de plano previamente aprovado.
- Respostas a questões de sinais de alerta, sono, disposição, estresse e dor muscular habitual.
- Regiões do corpo marcadas no mapa (inclusive regiões aproximadas de órgãos), intensidade do incômodo e percepção sobre a natureza da dor. Não são dados sobre diagnóstico clínico.

**Não digite dados pessoais reais ou informações médicas identificáveis no piloto.** Esta versão se destina à demonstração e à validação de interface/lógica, não ao atendimento de alunos reais.

## Onde ficam os dados?

Durante o uso, os valores são mantidos nos controles do navegador e em variáveis temporárias de JavaScript. O aplicativo não envia respostas, não usa API externa, não salva registros em banco, cookies ou armazenamento local e não coleta métricas analíticas. Ao recarregar/fechar a página, o aplicativo não mantém um cadastro de alunos. Alguns navegadores podem ter recursos próprios de restauração de abas/formulários fora do controle do aplicativo.

Os arquivos estáticos (HTML, JavaScript, CSS, imagens e manifest) podem ficar em cache para uso offline. **Respostas do check-in não fazem parte desse cache.** O provedor de hospedagem poderá manter logs técnicos de acesso segundo sua própria política.

## O que o resultado significa?

É apenas orientação educativa. Sinais graves indicam pausa e busca de atendimento. Os demais resultados não constituem avaliação médica, autorização para atividade física, diagnóstico ou prescrição profissional. A pontuação 0–100 é apenas uma heurística **não validada cientificamente** e suas faixas exigem revisão antes de qualquer uso real.

## Etapa futura

Cadastros efetivos dependem de definição de controlador, política de privacidade, base legal e regras específicas para dados sensíveis de saúde, autenticação, controles de acesso, retenção, eliminação e resposta a incidentes. O piloto não oferece esses recursos.

Para estudos de prontidão física, consulte a [PAR-Q+ oficial](https://eparmedx.com/); o formulário não foi incorporado ao aplicativo.

**Made by TAP**
