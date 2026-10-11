import test from 'node:test';
import assert from 'node:assert/strict';
import {assess, normalizeCheckin} from '../js/engine.mjs';
const base = () => ({adult:true, hasApprovedPlan:true, trainingType:'misto', plannedMinutes:50,
  approvedRpeCap:6, sleepHours:8, energy:8, stress:2, soreness:2,
  chestPain:false, severeBreathlessness:false, fainting:false, fever:false,
  dizziness:false, newPain:false, healthChange:false});
test('sem sinais e com recuperação favorável mantém apenas plano aprovado', () => {
 const out=assess(base());assert.equal(out.status,'programado');assert.equal(out.duration,50);
 assert.equal(out.rpeMax,6);assert.equal(out.actions.length,3);
});
test('sinal de emergência vence qualquer escore', () => {
 for (const f of ['chestPain','severeBreathlessness','fainting']) {
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
