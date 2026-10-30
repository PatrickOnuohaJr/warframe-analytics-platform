import test from 'node:test';
import assert from 'node:assert/strict';
import { getWeaponTags, isIncarnon } from '../src/utils/weaponTags.js';

const ignis = {
  category: 'Primary',
  weapon_type: 'Rifle',
  raw_json: {
    type: 'Rifle', trigger: 'Held', fireRate: 8, reloadTime: 2, criticalChance: 0.11,
    criticalMultiplier: 2, procChance: 0.27, damage: { heat: 33, toxin: 0 }, attacks: [{ name: 'Normal Attack' }],
  },
};

test('Ignis is a beam with high fire rate, high status, and a heat element', () => {
  const tags = getWeaponTags(ignis);
  for (const t of ['Rifle', 'Beam', 'High Fire Rate', 'High Status Chance', 'Innate Element', 'Heat']) {
    assert.ok(tags.includes(t), `missing ${t}`);
  }
  assert.ok(!tags.includes('High Crit Chance'));
  assert.ok(!tags.includes('Incarnon'));
});

test('bows get Charge, and a charge_time attack counts as Charge', () => {
  const paris = {
    category: 'Primary', weapon_type: 'Bow',
    raw_json: { type: 'Bow', trigger: 'Charge', fireRate: 1, damage: {}, attacks: [{ name: 'Charged Shot', charge_time: 0.5 }] },
  };
  assert.ok(getWeaponTags(paris).includes('Charge'));
});

test('Incarnon: native flag or an Incarnon Form attack', () => {
  assert.equal(isIncarnon({ raw_json: { native_incarnon: true } }), true);
  assert.equal(isIncarnon({ raw_json: { attacks: [{ name: 'Incarnon Form' }] } }), true);
  assert.equal(isIncarnon({ raw_json: { attacks: [{ name: 'Normal Attack' }] } }), false);
});

test('melee uses attack speed and range, not gun rules', () => {
  const tags = getWeaponTags({
    category: 'Melee', weapon_type: 'Melee',
    raw_json: { type: 'Scythe', fireRate: 1.2, range: 3, criticalChance: 0.3, criticalMultiplier: 2.6, procChance: 0.1, damage: {}, attacks: [] },
  });
  for (const t of ['Scythe', 'Fast Attack Speed', 'Long Range', 'High Crit Chance', 'High Crit Damage']) {
    assert.ok(tags.includes(t), `missing ${t}`);
  }
  assert.ok(!tags.includes('High Fire Rate'));
});

test('weapon with no raw_json yields no tags', () => {
  assert.deepEqual(getWeaponTags({ category: 'Primary' }), []);
});

test('Kuva / Tenet / Coda origin tags come from the name', () => {
  const mk = name => ({ name, category: 'Primary', raw_json: { type: 'Rifle' } });
  assert.ok(getWeaponTags(mk('Kuva Karak')).includes('Kuva'));
  assert.ok(getWeaponTags(mk('Tenet Envoy')).includes('Tenet'));
  assert.ok(getWeaponTags(mk('Coda Hirudo')).includes('Coda'));
  assert.ok(getWeaponTags(mk('Dual Coda Torxica')).includes('Coda'));
  assert.ok(!getWeaponTags(mk('Karak')).includes('Kuva'));
});

test('melee and variant Incarnons are recognised by their Genesis adapter', () => {
  const mk = (name, category = 'Melee') => ({ name, category, raw_json: { type: 'Sword' } });
  ['Skana', 'Skana Prime', 'Prisma Skana', 'Ack & Brunt', 'Sancti Magistar', 'Nami Solo', 'Dual Ichor'].forEach(n => {
    assert.equal(isIncarnon(mk(n)), true, n);
  });
  assert.equal(isIncarnon(mk('Skanaa')), false);
  assert.equal(isIncarnon(mk('Galatine')), false);
  assert.equal(isIncarnon(mk('Bo Prime')), true);
});
