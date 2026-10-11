/**
 * Saúde by TAP Fitness — motor explicável de check-in pré-treino.
 * Heurísticas de PRODUTO não validadas clinicamente; NÃO determinam liberação,
 * diagnóstico, prescrição, etiologia ou órgão afetado.
 */
const TRAINING_TYPES = Object.freeze(['forca', 'cardio', 'misto', 'mobilidade']);

export const BODY_REGIONS = Object.freeze([
  {id:'cabeca', label:'Cabeça', group:'Cabeça e pescoço', type:'review'},
  {id:'pescoco', label:'Pescoço', group:'Cabeça e pescoço', type:'review'},
  {id:'torax', label:'Tórax / desconforto interno', group:'Tronco e áreas internas', type:'urgent'},
  {id:'peitoral', label:'Região peitoral / muscular', group:'Tronco e áreas internas', type:'review'},
  {id:'abdomen_superior', label:'Abdômen superior (região de estômago, fígado, vesícula)', group:'Tronco e áreas internas', type:'review'},
  {id:'abdomen_inferior', label:'Abdômen inferior (região intestinal / urinária)', group:'Tronco e áreas internas', type:'review'},
  {id:'pelve', label:'Pelve / região íntima', group:'Tronco e áreas internas', type:'review'},
  {id:'costas_superiores', label:'Parte alta das costas', group:'Tronco e áreas internas', type:'review'},
  {id:'lombar', label:'Lombar', group:'Tronco e áreas internas', type:'review'},
  {id:'ombro_d', label:'Ombro direito', group:'Membros superiores', type:'upper'},
  {id:'ombro_e', label:'Ombro esquerdo', group:'Membros superiores', type:'upper'},
  {id:'cotovelo_d', label:'Cotovelo direito', group:'Membros superiores', type:'upper'},
  {id:'cotovelo_e', label:'Cotovelo esquerdo', group:'Membros superiores', type:'upper'},
  {id:'mao_d', label:'Punho / mão direita', group:'Membros superiores', type:'upper'},
  {id:'mao_e', label:'Punho / mão esquerda', group:'Membros superiores', type:'upper'},
  {id:'quadril_d', label:'Quadril direito', group:'Membros inferiores', type:'lower'},
  {id:'quadril_e', label:'Quadril esquerdo', group:'Membros inferiores', type:'lower'},
  {id:'joelho_d', label:'Joelho direito', group:'Membros inferiores', type:'lower'},
  {id:'joelho_e', label:'Joelho esquerdo', group:'Membros inferiores', type:'lower'},
  {id:'tornozelo_d', label:'Tornozelo / pé direito', group:'Membros inferiores', type:'lower'},
  {id:'tornozelo_e', label:'Tornozelo / pé esquerdo', group:'Membros inferiores', type:'lower'},
]);
const REGION_LOOKUP = new Map(BODY_REGIONS.map((region) => [region.id, region]));

export function normalizeCheckin(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('Respostas não fornecidas.');
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
  if (!Array.isArray(raw.discomfortRegions) || raw.discomfortRegions.some((id) => typeof id !== 'string' || !REGION_LOOKUP.has(id)) || new Set(raw.discomfortRegions).size !== raw.discomfortRegions.length) {
    throw new TypeError('Regiões de incômodo inválidas.');
  }
  if (!['nenhum','habitual','novo','incerto'].includes(raw.discomfortKind)) throw new TypeError('Origem do incômodo não informada.');
  const discomfortIntensity = finite('discomfortIntensity', 0, 10);
  if ((raw.discomfortRegions.length === 0) !== (discomfortIntensity === 0 && raw.discomfortKind === 'nenhum')) {
    throw new RangeError('A intensidade, a localização e a origem do incômodo precisam ser consistentes.');
  }
  if (raw.discomfortRegions.length > 0 && (discomfortIntensity < 1 || raw.discomfortKind === 'nenhum')) {
    throw new RangeError('Detalhe o incômodo selecionado.');
  }
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
    suddenSeverePain: bool('suddenSeverePain'),
    neuroWarning: bool('neuroWarning'),
    cannotBearWeight: bool('cannotBearWeight'),
    discomfortRegions: [...raw.discomfortRegions],
    discomfortIntensity,
    discomfortKind: raw.discomfortKind,
  };
}

const clampScore = (value) => Math.min(100, Math.max(0, Math.round(value)));
const noTraining = (status, level, reasons, guidance, areas) => ({
  status, level, score:null, rpeMax:null, duration:null, reasons, guidance, areas, actions:[],
});

export function assess(raw) {
  const d = normalizeCheckin(raw);
  const locations = d.discomfortRegions.map((id) => REGION_LOOKUP.get(id));
  const areas = locations.map((region) => region.label);
  const critical = [
    d.chestPain && 'Dor, pressão ou aperto no peito relatado.',
    d.severeBreathlessness && 'Falta de ar intensa ou em repouso relatada.',
    d.fainting && 'Desmaio ou quase desmaio relatado.',
    d.suddenSeverePain && 'Dor intensa súbita ou piora abrupta relatada.',
    d.neuroWarning && 'Alteração neurológica importante relatada (força, sensibilidade ou controle urinário/intestinal).',
    d.cannotBearWeight && 'Incapacidade de apoiar o peso ou caminhar após possível lesão.',
    locations.some((r) => r.type === 'urgent') && 'Desconforto na região interna do tórax exige avaliação, independentemente do escore.',
  ].filter(Boolean);
  if (critical.length) return noTraining('urgente', 'PAUSAR E BUSCAR ATENDIMENTO', critical,
    'Não inicie treino nem atividades sugeridas. Procure avaliação de urgência. Se os sintomas forem atuais, intensos ou súbitos, acione o serviço de emergência local (SAMU 192, Brasil).', areas);

  const review = [
    !d.adult && 'Esta versão demonstrativa é destinada apenas a adultos.',
    !d.hasApprovedPlan && 'Não há plano de exercícios previamente aprovado pelo profissional.',
    d.fever && 'Febre ou quadro infeccioso atual.',
    d.dizziness && 'Tontura atual ou incomum.',
    d.newPain && 'Dor nova ou diferente da dor muscular normal de treino.',
    d.healthChange && 'Mudança relevante de saúde ou nova restrição.',
    d.sleepHours < 3 && 'Sono muito curto na última noite.',
    d.energy <= 2 && 'Energia extremamente baixa.',
    d.soreness >= 8 && 'Dor muscular muito intensa.',
    locations.some((r) => r.type === 'review') && 'Região de cabeça, pescoço, coluna, peitoral ou área interna sinalizada: a marcação não identifica qual órgão está envolvido.',
    d.discomfortKind === 'novo' && 'Incômodo novo: investigar antes de recomendar exercícios.',
    d.discomfortKind === 'incerto' && 'Origem do incômodo incerta: revisar antes do treino.',
    d.discomfortIntensity >= 4 && 'Incômodo moderado ou intenso: requer avaliação individual.',
    locations.filter((r) => r.type === 'upper').length && locations.some((r) => r.type === 'lower') && 'Incômodo em membros superiores e inferiores: não é possível selecionar uma atividade sem avaliação individual.',
  ].filter(Boolean);
  if (review.length) return noTraining('revisao', 'ADIAR E CONSULTAR PROFISSIONAL', review,
    'Não realize um treino com base nesta triagem. Mostre as regiões sinalizadas ao profissional de Educação Física; quando houver sinais clínicos ou incerteza, procure avaliação de saúde.', areas);

  // Pontuação heurística, sem validade clínica e sem equivalência a liberação.
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
  if (locations.length) { score -= 20; reasons.push('Incômodo habitual leve em região musculoesquelética — não sobrecarregar a área.'); }
  score = clampScore(score);
  const normal = score >= 75 && locations.length === 0;
  const recovery = score < 45;
  const status = normal ? 'programado' : recovery ? 'recuperacao' : 'reduzido';
  const duration = normal ? d.plannedMinutes : recovery ? null : Math.max(10, Math.floor(d.plannedMinutes * 0.7));
  const rpeMax = normal ? Math.min(d.approvedRpeCap, 6) : recovery ? null : Math.min(d.approvedRpeCap, 4);
  return {
    status,
    level: normal ? 'SEGUIR PLANO APROVADO' : recovery ? 'AVALIAR RECUPERAÇÃO COM PROFESSOR' : 'CONSIDERAR AJUSTE CONSERVADOR',
    score, rpeMax, duration, areas,
    reasons: reasons.length ? reasons : ['Sem sinais de alerta relatados e com indicadores subjetivos favoráveis.'],
    guidance: normal ? 'Siga somente o plano já aprovado. Esta triagem não atesta aptidão clínica.'
      : recovery ? 'Não execute o treino planejado com base nesta triagem. Converse com o professor sobre descanso ou recuperação.'
      : locations.length ? 'Antes de qualquer movimento, discuta com o professor o incômodo localizado. Não faça exercícios que provoquem ou aumentem dor; as sugestões abaixo são alternativas para avaliação, não prescrições.'
      : 'Combine a redução de volume e esforço com o professor antes de iniciar.',
    actions: buildActions(d.trainingType, status, duration, locations),
  };
}

/** Sugestões condicionais: somente para atividades JÁ previstas e aprovadas, nunca prescrição. */
export function buildActions(trainingType, status, duration, locations = []) {
  if (!TRAINING_TYPES.includes(trainingType) || !['programado','reduzido'].includes(status) || !Number.isFinite(duration) || duration < 10) return [];
  const label = 'Apenas se estiver no seu plano aprovado, sem provocar dor, e com confirmação do professor.';
  const easy = status === 'reduzido';
  const upperPain = locations.some((r) => r.type === 'upper');
  const lowerPain = locations.some((r) => r.type === 'lower');
  const categories = {
    forca: [
      ['Sentar e levantar do banco / exercício de pernas', 'Movimento de membros inferiores, sem acrescentar carga ou amplitude àquelas aprovadas.'],
      ['Remada ou puxada na máquina', 'Usar somente a variação, séries e cargas do plano estabelecido pelo professor.'],
    ],
    cardio: [
      ['Caminhada na esteira', 'Ritmo confortável; acompanhe a percepção de esforço e a capacidade de conversar.'],
      ['Bicicleta ergométrica', 'Pedalada leve a moderada, conforme a prescrição já aprovada.'],
    ],
    misto: [
      ['Caminhada ou bicicleta ergométrica', 'Escolha a opção já incluída no seu plano e ajuste volume com o professor.'],
      ['Blocos de força do programa', 'Somente exercícios, movimentos e cargas previstos e aprovados.'],
    ],
    mobilidade: [
      ['Mobilidade de ombros e região torácica', 'Movimentos suaves já previstos no plano, sem forçar amplitudes.'],
      ['Mobilidade de quadril e tornozelos', 'Use apenas movimentos aprovados e que não causem desconforto.'],
    ],
  };
  // Ao haver incômodo localizado, NÃO sugerir movimentos que sobrecarreguem a região.
  let options;
  if (upperPain || lowerPain) {
    options = upperPain
      ? [['Caminhada confortável', 'Alternativa de membros inferiores, apenas se não provocar sintomas e fizer parte do plano.'],
         ['Bicicleta ergométrica leve', 'Sem apoiar ou carregar peso nos membros superiores doloridos; somente se confortável e aprovada.']]
      : [['Atividade suave de membros superiores com apoio', 'Somente movimentos já aprovados, sem exigir apoio ou estabilização pela região dolorida.'],
         ['Mobilidade leve dos braços', 'Movimentos suaves sem dor; não realizar exercícios envolvendo as pernas afetadas.']];
  } else {
    options = categories[trainingType];
  }
  return [
    {title:'Aquecimento progressivo', detail:`Até 5–10 minutos, conforme o programa do professor, sem agravar sintomas. ${label}`},
    ...options.map(([title,detail]) => ({title, detail:`${detail} ${label}`})),
    {title:'Desaceleração e reavaliação', detail:`Encerrar progressivamente. Limite orientativo para toda a sessão: ${duration} min${easy ? ', com redução combinada com o professor' : ''}. Suspenda se houver dor ou outros sintomas.`},
  ];
}
