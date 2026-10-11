import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url),'utf8');
const js = readFileSync(new URL('../js/app.mjs', import.meta.url),'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url),'utf8');

test('mapa corporal é etapa independente antes do resultado', () => {
  for (let i=1;i<=4;i++) {
    assert.match(html, new RegExp(`id="chip-${i}"`));
    assert.match(html, new RegExp(`id="panel-${i}"`));
  }
  const form2 = html.indexOf('<form id="check-form"');
  const close2 = html.indexOf('</form>',form2);
  const panel3 = html.indexOf('id="panel-3"');
  const form3 = html.indexOf('<form id="map-form"');
  const panel4 = html.indexOf('id="panel-4"');
  assert.ok(form2>0 && close2<form3 && panel3<form3 && form3<panel4);
  assert.ok(panel3>close2 && html.includes('id="region-checkboxes"'));
  assert.ok(html.includes('id="no-regions"'));
});

test('check-in precisa ser validado antes de mostrar o mapa',()=>{
  assert.match(js,/if \(!checkForm\.reportValidity\(\) \|\| !profile\) return;\s*showStep\(3\)/);
  assert.match(js,/mapForm\.addEventListener\('submit'/);
  assert.match(js,/showStep\(4\)/);
  assert.match(js,/mapForm\.reset\(\)/);
});

test('cache PWA prioriza rede e troca a versão',()=>{
  assert.match(sw,/tap-fitness-pilot-v3/);
  assert.match(sw,/event\.respondWith\(fetch\(event\.request\)/);
  assert.doesNotMatch(sw,/event\.respondWith\(caches\.match\(event\.request\)\.then/);
});
