import { assess, BODY_REGIONS } from './engine.mjs';

const $ = (id) => document.getElementById(id);
const profileForm = $('profile-form');
const checkForm = $('check-form');
const mapForm = $('map-form');
const yes = (form, name) => new FormData(form).get(name) === 'yes';
let profile = null;
const selectedRegions = new Set();
const pointsByRegion = new Map();
const inputsByRegion = new Map();

function showStep(step) {
  for (let i=1; i<=4; i++) {
    $('panel-'+i).classList.toggle('hidden', i !== step);
    $('chip-'+i).classList.toggle('active', i === step);
    $('chip-'+i).classList.toggle('completed', i < step);
  }
  $('progress-bar').style.width = `${step * 100/4}%`;
  $('form-error').classList.add('hidden');
  $('main').scrollIntoView({behavior:'instant', block:'start'});
}

function error(message) {
  $('form-error').textContent = message;
  $('form-error').classList.remove('hidden');
}

profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!profileForm.reportValidity()) return;
  const f = new FormData(profileForm);
  profile = {
    alias: String(f.get('alias') || '').trim().slice(0,30),
    trainingType: String(f.get('trainingType') || ''),
    plannedMinutes: Number(f.get('plannedMinutes')),
    approvedRpeCap: Number(f.get('approvedRpeCap')),
    hasApprovedPlan: yes(profileForm, 'hasApprovedPlan'),
    adult: f.get('adult') === 'on',
  };
  if (profile.alias.length < 2) return error('Digite um apelido com pelo menos 2 caracteres.');
  showStep(2);
});

for (const key of ['sleepHours','energy','stress','soreness','discomfortIntensity']) {
  const input = $(key), output = $(key+'-out');
  input.addEventListener('input', () => {
    output.textContent = key === 'sleepHours' ? `${Number(input.value).toLocaleString('pt-BR')} h` : `${input.value}/10`;
  });
}

// Coordenadas aproximadas em porcentagem sobre a imagem anatômica de referência.
const MAP_POSITIONS = {
  // Vista frontal: coordenadas percentuais da imagem, referentes à área visível do corpo.
  cabeca:[29.0,7.5], pescoco:[28.0,16.4], torax:[25.3,25.6],
  peitoral:[35.4,25.8], abdomen_superior:[27.6,34.1],
  abdomen_inferior:[27.5,42.4], pelve:[28.8,46.7],
  // Vista posterior.
  costas_superiores:[70.1,20.2], lombar:[70.1,38.3],
  // Direita/esquerda anatômicas da pessoa (opostas ao observador na vista frontal).
  ombro_d:[15.7,19.2], ombro_e:[44.5,19.2],
  cotovelo_d:[10.4,35.4], cotovelo_e:[47.8,35.4],
  mao_d:[7.4,52.7], mao_e:[49.4,52.7],
  quadril_d:[22.5,51.2], quadril_e:[34.2,51.2],
  joelho_d:[21.6,66.2], joelho_e:[36.8,66.2],
  tornozelo_d:[21.8,83.9], tornozelo_e:[36.5,83.9],
};

function labelsForSelection(limit = 3) {
  return [...selectedRegions]
    .map((id) => BODY_REGIONS.find((region) => region.id === id)?.label)
    .filter(Boolean)
    .slice(0, limit);
}

function refreshRegions(customMessage = '') {
  for (const region of BODY_REGIONS) {
    const active = selectedRegions.has(region.id);
    const input = inputsByRegion.get(region.id);
    if (input) input.checked = active;
    const point = pointsByRegion.get(region.id);
    if (point) {
      point.classList.toggle('active', active);
      point.setAttribute('aria-pressed', String(active));
    }
  }
  const hasSelection = selectedRegions.size > 0;
  $('discomfort-details').classList.toggle('hidden', !hasSelection);
  $('discomfortIntensity').disabled = !hasSelection;
  $('discomfortKind').disabled = !hasSelection;
  $('discomfortKind').required = hasSelection;
  if (customMessage) {
    $('region-summary').textContent = customMessage;
    return;
  }
  if (!hasSelection) {
    $('region-summary').textContent = 'Nenhuma região selecionada';
    return;
  }
  const labels = labelsForSelection();
  $('region-summary').textContent = selectedRegions.size <= 3
    ? `${selectedRegions.size} ${selectedRegions.size===1 ? 'região selecionada' : 'regiões selecionadas'}: ${labels.join(', ')}`
    : `${selectedRegions.size} regiões selecionadas: ${labels.join(', ')}…`;
}

function setSelected(id, active) {
  if (active) selectedRegions.add(id);
  else selectedRegions.delete(id);
  if (!selectedRegions.size) $('discomfortKind').value = '';
  refreshRegions();
}

function createMap() {
  const list = $('region-checkboxes');
  const groups = new Map();
  const hotspotLayer = $('anatomy-hotspots');
  for (const region of BODY_REGIONS) {
    if (!groups.has(region.group)) {
      const section = document.createElement('fieldset');
      section.className = 'region-group';
      const legend = document.createElement('legend');
      legend.textContent = region.group;
      section.append(legend);
      list.append(section);
      groups.set(region.group, section);
    }
    const label = document.createElement('label');
    label.className = 'region-option';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.name = 'discomfort-region'; input.value = region.id;
    input.addEventListener('change', () => setSelected(region.id, input.checked));
    const span = document.createElement('span'); span.textContent = region.label;
    label.append(input,span); groups.get(region.group).append(label);
    inputsByRegion.set(region.id, input);

    const [left, top] = MAP_POSITIONS[region.id];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-point';
    button.style.left = `${left}%`;
    button.style.top = `${top}%`;
    button.setAttribute('aria-label', `Marcar ${region.label}`);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('title', region.label);
    button.dataset.label = region.label;
    button.innerHTML = '<span class="map-point-core" aria-hidden="true"></span><span class="map-point-text" aria-hidden="true"></span>';
    button.querySelector('.map-point-text').textContent = region.label;
    button.addEventListener('click', () => setSelected(region.id, !selectedRegions.has(region.id)));
    hotspotLayer.append(button);
    pointsByRegion.set(region.id, button);
  }
  refreshRegions();
}
createMap();
$('clear-regions').addEventListener('click', () => {
  selectedRegions.clear();
  $('discomfortKind').value = '';
  refreshRegions();
});
$('no-regions').addEventListener('click', () => {
  selectedRegions.clear();
  $('discomfortKind').value = '';
  refreshRegions('Confirmado: nenhum incômodo informado hoje');
});
$('back-button').addEventListener('click', () => showStep(1));
$('map-back-button').addEventListener('click', () => showStep(2));

checkForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!checkForm.reportValidity() || !profile) return;
  showStep(3);
});

mapForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!mapForm.reportValidity() || !checkForm.reportValidity() || !profile) return;
  const data = {...profile};
  const answers = new FormData(checkForm);
  for (const key of ['chestPain','severeBreathlessness','fainting','fever','dizziness','newPain','healthChange','suddenSeverePain','neuroWarning','cannotBearWeight']) {
    const value = answers.get(key);
    if (value !== 'yes' && value !== 'no') return error('Responda SIM ou NÃO em todas as perguntas de segurança.');
    data[key] = value === 'yes';
  }
  for (const key of ['sleepHours','energy','stress','soreness']) data[key] = Number($(key).value);
  data.discomfortRegions = [...selectedRegions];
  data.discomfortIntensity = selectedRegions.size ? Number($('discomfortIntensity').value) : 0;
  data.discomfortKind = selectedRegions.size ? $('discomfortKind').value : 'nenhum';
  if (selectedRegions.size && !data.discomfortKind) return error('Informe como descreveria o incômodo nas áreas selecionadas.');
  try { renderResult(assess(data), profile.alias); showStep(4); }
  catch { error('Não foi possível validar as respostas. Confira os campos e tente novamente.'); }
});

function textNode(tag, value, className) {
  const el = document.createElement(tag); el.textContent = value;
  if (className) el.className = className;
  return el;
}

function renderResult(result, alias) {
  $('greeting').textContent = `${alias}, veja os sinais observados e converse com o professor antes de ajustar seu treino.`;
  const card = $('result-card');
  card.className = 'result-card result-'+result.status;
  $('result-symbol').textContent = ({urgente:'!',revisao:'!',recuperacao:'↘',reduzido:'~',programado:'✓'})[result.status];
  $('result-tag').textContent = ({urgente:'ATENÇÃO URGENTE',revisao:'REVISÃO NECESSÁRIA',recuperacao:'RECUPERAÇÃO',reduzido:'AJUSTE CONSERVADOR',programado:'PLANO APROVADO'})[result.status];
  $('result-level').textContent = result.level;
  $('result-guidance').textContent = result.guidance;
  $('metric-score').textContent = result.score === null ? '—' : `${result.score}/100`;
  $('metric-rpe').textContent = result.rpeMax === null ? '—' : `${result.rpeMax}/10`;
  $('metric-time').textContent = result.duration === null ? '—' : `${result.duration} min`;
  $('metrics').classList.toggle('hidden', result.score === null);
  const ul = $('reasons-list'); ul.replaceChildren();
  for (const reason of result.reasons) ul.append(textNode('li',reason));
  $('regions-result').classList.toggle('hidden',!result.areas.length);
  $('regions-result-summary').textContent = result.areas.length
    ? `Locais informados: ${result.areas.join('; ')}. A localização não confirma lesão ou comprometimento de qualquer órgão.` : '';
  $('actions-section').classList.toggle('hidden', result.actions.length === 0);
  const actions = $('actions-list'); actions.replaceChildren();
  for (const [index,action] of result.actions.entries()) {
    const row = textNode('div','','action-row');
    row.append(textNode('span',String(index+1).padStart(2,'0'),'action-number'));
    const info = textNode('div','');
    info.append(textNode('strong',action.title));info.append(textNode('p',action.detail));
    row.append(info);actions.append(row);
  }
}

$('restart-button').addEventListener('click', () => {
  profile = null; selectedRegions.clear(); profileForm.reset(); checkForm.reset(); mapForm.reset();
  for (const key of ['sleepHours','energy','stress','soreness','discomfortIntensity']) $(key).dispatchEvent(new Event('input'));
  refreshRegions(); showStep(1);
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{});
}
