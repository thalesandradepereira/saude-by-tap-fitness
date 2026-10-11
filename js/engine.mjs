/**
 * Saúde by TAP Fitness — motor de prontidão (MVP educativo).
 * A pontuação e seus limiares são heurísticas de produto, NÃO uma escala clínica validada.
 * Sinais de alerta e revisão profissional sempre têm precedência sobre a pontuação.
 */
const TRAINING_TYPES = Object.freeze(['forca', 'cardio', 'misto', 'mobilidade']);

export function normalizeCheckin(raw) {
  if (!raw || typeof raw !== 'object') throw new TypeError('Respostas não fornecidas.');
  const finite = (field, min, max) => {
    if (typeof raw[field] !== 'number' || !Number.isFinite(raw[field]) || raw[field] < min || raw[field] > max) {
      throw new RangeError(`Campo inválido: ${field}.`);
    }
    return raw[field];
  };
  const bool = (field) => {
    if (typeof raw[field] !== 'boolean') throw new TypeError(`Resposta obrigatória: ${field}.`);
    return raw[field];
  };
  if (!TRAINING_TYPES.includes(raw.trainingType)) throw new TypeError('Tipo de treino não reconhecido.');
  return {
    trainingType: raw.trainingType,
    hasApprovedPlan: bool('hasApprovedPlan'),
    adult: bool('adult'),
    plannedMinutes: finite('plannedMinutes', 10, 120),
    approvedRpeCap: finite('approvedRpeCap', 1, 10),
    sleepHours: finite('sleepHours', 0, 14),
    energy: finite('energy', 0, 10),
    stress: finite('stress', 0, 10),
    soreness: finite('soreness', 0, 10),
    chestPain: bool('chestPain'),
    severeBreathlessness: bool('severeBreathlessness'),
    fainting: bool('fainting'),
    fever: bool('fever'),
    dizziness: bool('dizziness'),
    newPain: bool('newPain'),
    healthChange: bool('healthChange'),
  };
}

function clampScore(value) { return Math.min(100, Math.max(0, Math.round(value))); }

export function assess(raw) {
  const d = normalizeCheckin(raw);
  const critical = [
    d.chestPain && 'Dor ou pressão no peito relatada.',
    d.severeBreathlessness && 'Falta de ar intensa ou em repouso relatada.',
    d.fainting && 'Desmaio ou quase-desmaio relatado.',
  ].filter(Boolean);
  if (critical.length) return {
    status: 'urgente', level: 'PAUSAR E BUSCAR ATENDIMENTO', score: null,
    rpeMax: null, duration: null, reasons: critical,
    guidance: 'Não inicie o treino. Procure avaliação médica urgente; se os sintomas forem atuais ou intensos, acione o serviço de emergência local (SAMU 192, Brasil).',
    actions: [],
  };

  const review = [
    !d.adult && 'Esta versão demonstrativa é destinada apenas a adultos.',
    !d.hasApprovedPlan && 'Não há plano de exercícios previamente aprovado pelo profissional.',
    d.fever && 'Febre ou quadro infeccioso atual.',
    d.dizziness && 'Tontura atual ou incomum.',
    d.newPain && 'Dor nova ou diferente da dor muscular habitual.',
    d.healthChange && 'Mudança relevante da saúde ou nova restrição.',
    d.sleepHours < 3 && 'Sono muito curto na última noite.',
    d.energy <= 2 && 'Energia extremamente baixa.',
    d.soreness >= 8 && 'Dor muscular muito intensa.',
  ].filter(Boolean);
  if (review.length) return {
    status: 'revisao', level: 'ADIAR E CONSULTAR PROFISSIONAL', score: null,
    rpeMax: null, duration: null, reasons: review,
    guidance: 'Não inicie um treino sugerido pelo aplicativo. Procure o profissional responsável para avaliar a situação e decidir os próximos passos; quando necessário, busque avaliação de saúde.',
    actions: [],
  };

  // Penalidades heurísticas: não equivalem a diagnóstico, clearance ou teste de esforço.
  let score = 100;
  const reasons = [];
  if (d.sleepHours < 5) { score -= 28; reasons.push('Sono abaixo de 5 horas.'); }
  else if (d.sleepHours < 7) { score -= 14; reasons.push('Sono abaixo de 7 horas.'); }
  if (d.energy <= 4) { score -= 28; reasons.push('Energia reduzida.'); }
  else if (d.energy <= 6) { score -= 12; reasons.push('Energia intermediária.'); }
  if (d.stress >= 8) { score -= 20; reasons.push('Estresse elevado.'); }
  else if (d.stress >= 6) { score -= 10; reasons.push('Estresse moderado-alto.'); }
  if (d.soreness >= 6) { score -= 22; reasons.push('Dor muscular habitual elevada.'); }
  else if (d.soreness >= 4) { score -= 10; reasons.push('Dor muscular habitual moderada.'); }
  score = clampScore(score);
  const normal = score >= 75;
  const recovery = score < 45;
  const status = normal ? 'programado' : recovery ? 'recuperacao' : 'reduzido';
  const duration = normal ? d.plannedMinutes : recovery ? null : Math.max(10, Math.floor(d.plannedMinutes * 0.7));
  const rpeMax = normal ? Math.min(d.approvedRpeCap, 6) : recovery ? null : Math.min(d.approvedRpeCap, 4);
  const actions = buildActions(d.trainingType, status, duration);
  return {
    status,
    level: normal ? 'SEGUIR PLANO APROVADO' : recovery ? 'AVALIAR RECUPERAÇÃO COM PROFESSOR' : 'CONSIDERAR AJUSTE CONSERVADOR',
    score, rpeMax, duration,
    reasons: reasons.length ? reasons : ['Sem sinais de alerta relatados e com indicadores subjetivos favoráveis.'],
    guidance: normal
      ? 'Siga somente o plano já aprovado, respeitando seus limites. Esta triagem não atesta aptidão clínica.'
      : recovery
        ? 'Não execute o treino planejado com base nesta triagem. Converse com o professor sobre descanso ou recuperação.'
        : 'Antes de iniciar, combine a redução de volume e esforço com o professor responsável.',
    actions,
  };
}

export function buildActions(trainingType, status, duration) {
  if (status === 'urgente' || status === 'revisao' || status === 'recuperacao') return [];
  const easy = status === 'reduzido';
  const setup = {
    forca: ['Musculação', easy ? 'Reduzir séries/volume do treino já aprovado, sem aumentar cargas.' : 'Executar somente os exercícios e cargas já aprovados, sem progressão automática.'],
    cardio: ['Aeróbico', easy ? 'Preferir caminhada ou bicicleta leve, se já aprovadas, com teste da fala confortável.' : 'Seguir o aeróbico já aprovado, conferindo esforço pela percepção e pelo teste da fala.'],
    misto: ['Treino misto', easy ? 'Priorizar parte leve do programa já aprovado e reduzir o volume global.' : 'Seguir os blocos do programa já aprovado, sem acrescentar intensidade.'],
    mobilidade: ['Mobilidade', easy ? 'Movimentos suaves do protocolo aprovado; evitar exercícios que causem dor.' : 'Seguir o programa de mobilidade já aprovado, sem forçar amplitude.'],
  }[trainingType];
  return [
    { title: 'Aquecimento', detail: '5–10 min progressivos, conforme o plano aprovado.' },
    { title: setup[0], detail: `${setup[1]} Tempo total sugerido: até ${duration} min.` },
    { title: 'Desaceleração', detail: 'Encerrar progressivamente e avisar se surgirem sintomas.' },
  ];
}
