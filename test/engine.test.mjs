import test from 'node:test';
import assert from 'node:assert/strict';
import {assess, normalizeCheckin} from '../js/engine.mjs';
const base = () => ({adult:true, hasApprovedPlan:true, trainingType:'misto', plannedMinutes:50,
  approvedRpeCap:6, sleepHours:8, energy:8, stress:2, soreness:2,
  chestPain:false, severeBreathlessness:false, fainting:false, fever:false,
  dizziness:false, newPain:false, healthChange:false, suddenSeverePain:false, neuroWarning:false, cannotBearWeight:false,
  discomfortRegions:[], discomfortIntensity:0, discomfortKind:'nenhum'});
test('sem sinais e com recuperação favorável mantém apenas plano aprovado', () => {
 const out=assess(base());assert.equal(out.status,'programado');assert.equal(out.duration,50);
 assert.equal(out.rpeMax,6);assert.equal(out.actions.length,4);
});
test('sinal de emergência vence qualquer escore', () => {
 for (const f of ['chestPain','severeBreathlessness','fainting','suddenSeverePain','neuroWarning','cannotBearWeight']) {
  const out=assess({...base(),[f]:true});assert.equal(out.status,'urgente');assert.equal(out.actions.length,0);
  assert.equal(out.rpeMax,null);
 }
});
test('situações não urgentes exigem revisão', () => {
 for (const f of ['fever','dizziness','newPain','healthChange']) {
  assert.equal(assess({...base(),[f]:true}).status,'revisao');
 }
});
test('ausência de plano e menoridade nunca autoriza treinar', () => {
 assert.equal(assess({...base(),hasApprovedPlan:false}).status,'revisao');
 assert.equal(assess({...base(),adult:false}).status,'revisao');
});
test('múltiplos fatores reduzem intensidade e duração',()=>{
 const out=assess({...base(),sleepHours:5.5,energy:5,stress:6,soreness:4});
 assert.equal(out.status,'reduzido');assert.equal(out.duration,35);assert.equal(out.rpeMax,4);
});
test('recuperação insuficiente não gera exercícios',()=>{
 const out=assess({...base(),sleepHours:4,energy:3,stress:9,soreness:7});
 assert.equal(out.status,'recuperacao');assert.equal(out.duration,null);assert.equal(out.actions.length,0);
});
test('limite de RPE do profissional sempre prevalece',()=>{
 const a=assess({...base(),approvedRpeCap:3});
 const b=assess({...base(),approvedRpeCap:3,energy:5,sleepHours:5});
 assert.equal(a.rpeMax,3);assert.equal(b.rpeMax,3);
});
test('respostas ausentes e fora da faixa são rejeitadas',()=>{
 assert.throws(()=>normalizeCheckin({...base(),sleepHours:'8'}),/inválido/);
 assert.throws(()=>normalizeCheckin({...base(),energy:14}),/inválido/);
 assert.throws(()=>normalizeCheckin({...base(),chestPain:undefined}),/obrigatória/);
 assert.throws(()=>normalizeCheckin({...base(),trainingType:'crossfit'}),/reconhecido/);
});
test('urgência independe de ausência de plano',()=>{
 assert.equal(assess({...base(),hasApprovedPlan:false,fainting:true}).status,'urgente');
});
test('limites extremos aceitos não geram aumentos de carga',()=>{
 const out=assess({...base(),approvedRpeCap:10,plannedMinutes:120});
 assert.equal(out.rpeMax,6);assert.equal(out.duration,120);
});


test('tórax interno gera urgência mesmo quando todos outros sinais estão negativos',()=>{
 const out=assess({...base(),discomfortRegions:['torax'],discomfortIntensity:1,discomfortKind:'habitual'});
 assert.equal(out.status,'urgente');assert.equal(out.actions.length,0);assert.equal(out.rpeMax,null);
});
test('incômodo em regiões viscerais e peitoral não gera indicação de exercício',()=>{
 for (const region of ['abdomen_superior','abdomen_inferior','pelve','peitoral','cabeca','pescoco','lombar','costas_superiores']) {
  const out=assess({...base(),discomfortRegions:[region],discomfortIntensity:2,discomfortKind:'habitual'});
  assert.equal(out.status,'revisao',region);assert.deepEqual(out.actions,[],region);
 }
});
test('dor nova, de origem incerta ou 4+ demanda avaliação e nenhuma atividade',()=>{
 for(const changes of [{discomfortKind:'novo'},{discomfortKind:'incerto'},{discomfortIntensity:4},{discomfortIntensity:10}]){
  const out=assess({...base(),discomfortRegions:['joelho_d'],discomfortIntensity:2,discomfortKind:'habitual',...changes});
  assert.equal(out.status,'revisao');assert.equal(out.actions.length,0);
 }
});
test('incômodo habitual leve em ombro reduz esforço e não sugere exercícios de braços',()=>{
 const out=assess({...base(),discomfortRegions:['ombro_e'],discomfortIntensity:2,discomfortKind:'habitual'});
 assert.equal(out.status,'reduzido');assert.equal(out.rpeMax,4);assert.equal(out.duration,35);
 assert.equal(out.areas[0],'Ombro esquerdo');
 assert.ok(out.actions.some(a=>a.title.includes('Bicicleta')));
 assert.equal(out.actions.some(a=>/Remada|puxada|membros superiores com apoio/.test(a.title)),false);
});
test('incômodo habitual leve em joelho oferece apenas sugestões sem carga nas pernas',()=>{
 const out=assess({...base(),discomfortRegions:['joelho_d'],discomfortIntensity:2,discomfortKind:'habitual'});
 assert.equal(out.status,'reduzido');
 assert.equal(out.actions.some(a=>/Caminhada|Bicicleta|exercício de pernas/.test(a.title)),false);
 assert.ok(out.actions.some(a=>a.title.includes('membros superiores')));
});
test('incômodos simultâneos em membros superiores e inferiores bloqueiam exercícios',()=>{
 const out=assess({...base(),discomfortRegions:['cotovelo_e','tornozelo_d'],discomfortIntensity:1,discomfortKind:'habitual'});
 assert.equal(out.status,'revisao');assert.equal(out.actions.length,0);
});
test('sem incômodos oferece sugestões concretas por modalidade apenas em plano aprovado',()=>{
 for (const trainingType of ['forca','cardio','misto','mobilidade']) {
  const out=assess({...base(),trainingType});
  assert.equal(out.status,'programado'); assert.equal(out.actions.length,4);
  assert.ok(out.actions.every(a=>a.detail.includes('plano') || a.title.includes('Desaceleração')));
 }
});
test('respostas de regiões obrigatórias e inconsistentes são recusadas',()=>{
 assert.throws(()=>normalizeCheckin({...base(),discomfortRegions:['ficticia']}),/Regiões/);
 assert.throws(()=>normalizeCheckin({...base(),discomfortRegions:['joelho_d','joelho_d']}),/Regiões/);
 assert.throws(()=>normalizeCheckin({...base(),discomfortRegions:'joelho_d'}),/Regiões/);
 assert.throws(()=>normalizeCheckin({...base(),discomfortRegions:['joelho_d']}),/consistentes/);
 assert.throws(()=>normalizeCheckin({...base(),discomfortKind:'novo'}),/consistentes/);
 assert.throws(()=>normalizeCheckin({...base(),discomfortIntensity:3}),/consistentes/);
 assert.throws(()=>normalizeCheckin({...base(),suddenSeverePain:undefined}),/obrigatória/);
});
test('região selecionada não supera sinais de risco ou plano não aprovado',()=>{
 const selected={...base(),discomfortRegions:['mao_d'],discomfortIntensity:1,discomfortKind:'habitual'};
 assert.equal(assess({...selected,neuroWarning:true}).status,'urgente');
 assert.equal(assess({...selected,hasApprovedPlan:false}).status,'revisao');
});
test('RPE aprovado muito baixo permanece teto para incômodo leve',()=>{
 const out=assess({...base(),approvedRpeCap:2,discomfortRegions:['tornozelo_e'],discomfortIntensity:1,discomfortKind:'habitual'});
 assert.equal(out.status,'reduzido');assert.equal(out.rpeMax,2);
});
