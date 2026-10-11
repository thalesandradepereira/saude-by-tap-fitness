import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url),'utf8');
const js = readFileSync(new URL('../js/app.mjs', import.meta.url),'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url),'utf8');

test('mapa anatômico é etapa independente antes do resultado', () => {
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
  assert.ok(html.includes('assets/anatomia-mapa.webp'));
  assert.ok(html.includes('id="anatomy-hotspots"'));
});

test('check-in precisa ser validado antes de mostrar o mapa anatômico',()=>{
  assert.match(js,/if \(!checkForm\.reportValidity\(\) \|\| !profile\) return;\s*showStep\(3\)/);
  assert.match(js,/mapForm\.addEventListener\('submit'/);
  assert.match(js,/showStep\(4\)/);
  assert.match(js,/mapForm\.reset\(\)/);
  assert.match(js,/anatomy-hotspots/);
  assert.match(js,/Confirmado: nenhum incômodo informado hoje/);
});

test('cache PWA inclui a imagem anatômica e troca a versão',()=>{
  assert.match(sw,/tap-fitness-pilot-v4/);
  assert.match(sw,/assets\/anatomia-mapa\.webp/);
  assert.match(sw,/event\.respondWith\(fetch\(event\.request\)/);
  assert.doesNotMatch(sw,/event\.respondWith\(caches\.match\(event\.request\)\.then/);
});
