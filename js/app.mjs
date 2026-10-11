import { assess } from './engine.mjs';

const $ = (id) => document.getElementById(id);
const profileForm = $('profile-form');
const checkForm = $('check-form');
const yes = (form, name) => new FormData(form).get(name) === 'yes';
let profile = null;

function showStep(step) {
  for (let i=1;i<=3;i++) {
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

profileForm.addEventListener('submit', (event)=>{
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

for(const key of ['sleepHours','energy','stress','soreness']) {
  const input=$(key), output=$(key+'-out');
  input.addEventListener('input', () => {
    output.textContent = key === 'sleepHours' ? `${Number(input.value).toLocaleString('pt-BR')} h` : `${input.value}/10`;
  });
}

$('back-button').addEventListener('click',()=>showStep(1));
checkForm.addEventListener('submit',(event)=>{
  event.preventDefault();
  if (!checkForm.reportValidity() || !profile) return;
  const data = {...profile};
  for(const key of ['chestPain','severeBreathlessness','fainting','fever','dizziness','newPain','healthChange']) {
    const value = new FormData(checkForm).get(key);
    if (value !== 'yes' && value !== 'no') return error('Responda SIM ou NÃO em todas as perguntas de segurança.');
    data[key] = value === 'yes';
  }
  for(const key of ['sleepHours','energy','stress','soreness']) data[key] = Number($(key).value);
  try { renderResult(assess(data), profile.alias); showStep(3); }
  catch { error('Não foi possível validar as respostas. Confira os campos e tente novamente.'); }
});

function textNode(tag, value, className) {
  const el = document.createElement(tag);
  el.textContent = value;
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
  const ul=$('reasons-list');ul.replaceChildren();
  for(const reason of result.reasons) ul.append(textNode('li',reason));
  $('actions-section').classList.toggle('hidden',result.actions.length===0);
  const actions=$('actions-list'); actions.replaceChildren();
  for(const [index, action] of result.actions.entries()) {
    const row = textNode('div','', 'action-row');
    row.append(textNode('span',String(index+1).padStart(2,'0'),'action-number'));
    const info=textNode('div','');info.append(textNode('strong',action.title));info.append(textNode('p',action.detail));row.append(info);actions.append(row);
  }
  // Dados de saúde permanecem apenas em memória: a tela não envia, salva nem exporta respostas.
}
$('restart-button').addEventListener('click',()=>{
  profile = null; profileForm.reset();checkForm.reset();
  for(const key of ['sleepHours','energy','stress','soreness']) $(key).dispatchEvent(new Event('input'));
  showStep(1);
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js', {scope:'./'}).catch(()=>{});
}
