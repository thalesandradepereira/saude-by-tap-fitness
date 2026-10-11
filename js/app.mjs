import { assess, BODY_REGIONS } from './engine.mjs';

const $ = (id) => document.getElementById(id);
const profileForm = $('profile-form');
const checkForm = $('check-form');
const yes = (form, name) => new FormData(form).get(name) === 'yes';
let profile = null;
const selectedRegions = new Set();
const circlesByRegion = new Map();
const inputsByRegion = new Map();

function showStep(step) {
  for (let i=1; i<=3; i++) {
    $('panel-'+i).classList.toggle('hidden', i !== step);
    $('chip-'+i).classList.toggle('active', i === step);
    $('chip-'+i).classList.toggle('completed', i < step);
  }
  $('progress-bar').style.width = `${step * 100/3}%`;
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

// Mapa orientativo: coordenadas não representam órgãos nem diagnóstico.
const MAP_POSITIONS = {
  cabeca:['front',100,34], pescoco:['front',100,77], torax:['front',100,119],
  peitoral:['front',83,137], abdomen_superior:['front',100,164],
  abdomen_inferior:['front',100,197], pelve:['front',100,225],
  costas_superiores:['back',100,129], lombar:['back',100,188],
  ombro_d:['front',61,101], ombro_e:['front',139,101],
  cotovelo_d:['front',43,166], cotovelo_e:['front',157,166],
  mao_d:['front',29,207], mao_e:['front',171,207],
  quadril_d:['front',79,247], quadril_e:['front',121,247],
  joelho_d:['front',83,295], joelho_e:['front',117,295],
  tornozelo_d:['front',85,339], tornozelo_e:['front',115,339],
};

function refreshRegions() {
  for (const region of BODY_REGIONS) {
    const active = selectedRegions.has(region.id);
    inputsByRegion.get(region.id).checked = active;
    const point = circlesByRegion.get(region.id);
    point.classList.toggle('active', active);
    point.setAttribute('aria-pressed', String(active));
  }
  const hasSelection = selectedRegions.size > 0;
  $('discomfort-details').classList.toggle('hidden', !hasSelection);
  $('discomfortIntensity').disabled = !hasSelection;
  $('discomfortKind').disabled = !hasSelection;
  $('discomfortKind').required = hasSelection;
  $('region-summary').textContent = hasSelection
    ? `${selectedRegions.size} ${selectedRegions.size===1 ? 'região selecionada' : 'regiões selecionadas'}`
    : 'Nenhuma região selecionada';
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

    const [view,x,y] = MAP_POSITIONS[region.id];
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(x)); circle.setAttribute('cy', String(y));
    circle.setAttribute('r','9'); circle.classList.add('map-point');
    circle.setAttribute('role','button'); circle.setAttribute('tabindex','0');
    circle.setAttribute('aria-label',`Marcar ${region.label}`);
    circle.setAttribute('aria-pressed','false');
    circle.addEventListener('click', () => setSelected(region.id,!selectedRegions.has(region.id)));
    circle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(region.id,!selectedRegions.has(region.id)); }
    });
    $(view+'-points').append(circle);
    circlesByRegion.set(region.id,circle);
  }
  refreshRegions();
}
createMap();
$('clear-regions').addEventListener('click', () => { selectedRegions.clear(); $('discomfortKind').value=''; refreshRegions(); });
$('back-button').addEventListener('click', () => showStep(1));

checkForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!checkForm.reportValidity() || !profile) return;
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
  try { renderResult(assess(data), profile.alias); showStep(3); }
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
  // Dados do check-in são temporários e não são enviados, persistidos ou exportados.
}

$('restart-button').addEventListener('click', () => {
  profile = null; selectedRegions.clear(); profileForm.reset(); checkForm.reset();
  for (const key of ['sleepHours','energy','stress','soreness','discomfortIntensity']) $(key).dispatchEvent(new Event('input'));
  refreshRegions(); showStep(1);
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
}
