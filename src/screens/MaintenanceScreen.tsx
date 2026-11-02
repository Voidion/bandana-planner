/* Maintenance, laid out like the prototype: the Cricut Venture (the blade in the machine, checks, replacements, what
   your blades really last, every blade, tool and mat) and the sewing machine (seam and hours sewn), each with upkeep. */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { dayLabel, plural } from '../lib/format';
import { cutsForRun, inMachine, seamBand, seamOf, seamYd, TASK_U, taskLeft, taskState, toolLearned, toolState, unitWord, usedTool, type EquipTask, type EquipTool, type TaskUnit } from '../state/equip';
import { addTask, checkTool, deleteTask, editEquipTool, editTask, replaceTool, setClamp, setMachineName, taskDone, adoptLearned } from '../state/equipActions';
import { useShop } from '../state/store';
import { ChevIcon, ClockIcon, EditIcon, PlusIcon, ScissorsIcon, WrenchIcon } from '../ui/icons';
import { Button, Chip, Field, NumField, Segmented, Select, Sheet, showSnack, T } from '../ui/kit';
import { HeadBtn, LinkText, Note, PageHead, Sect, Strip, WList } from '../ui/proto';
import { F, shadow, useTheme } from '../ui/theme';

const WHY = ['Fuzzy edges', 'Threads not cut through', 'Chipped or broke', 'Just time for a new one'];

function Dur({ t, big }: { t: EquipTool; big?: boolean }) {
  const th = useTheme();
  const st = toolState(t);
  if (!st.life) return null;
  const col = st.tone === 'bad' ? th.danger : st.tone === 'warn' ? th.barA : th.success;
  return (
    <View style={{ height: big ? 10 : 6, borderRadius: 5, backgroundColor: th.sunken, overflow: 'hidden', marginTop: big ? 4 : 6 }}>
      <View style={{ height: big ? 10 : 6, borderRadius: 5, width: `${Math.max(2, (st.pct || 0) * 100)}%`, backgroundColor: col }} />
      {t.check ? <View style={{ position: 'absolute', left: `${Math.min(100, ((t.lastCheck + t.check) / st.life) * 100)}%`, top: 0, bottom: 0, width: 2, backgroundColor: th.text }} /> : null}
    </View>
  );
}

export function MaintenanceScreen() {
  const shop = useShop();
  const t = useTheme();
  const E = shop.equip;
  const [m, setM] = useState<'venture' | 'sewing'>('venture');
  const [tool, setTool] = useState<string | null>(null);
  const [task, setTask] = useState<string | null>(null);
  const [replace, setReplace] = useState<string | null>(null);
  const [clamp, setClampOpen] = useState(false);
  const [more, setMore] = useState<Record<string, boolean>>({});
  const tasks = E.tasks.filter(x => x.machine === m).sort((a, b) => +taskState(E, b).due - +taskState(E, a).due || taskState(E, b).p - taskState(E, a).p);
  const dueTasks = tasks.filter(x => taskState(E, x).due);
  const dueTools = m === 'venture' ? E.tools.filter(x => usedTool(E, x) && toolState(x).tone !== 'ok') : [];
  const b = inMachine(E);
  const bs = b ? toolState(b) : null;
  const dueN = dueTasks.length + dueTools.length;

  const toolRow = (x: EquipTool) => {
    const st = toolState(x);
    return (
      <Pressable key={x.id} accessibilityRole="button" onPress={() => setTool(x.id)} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
        <ScissorsIcon color={t.text2} size={22} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: F.f16, color: t.text }}>{x.name}</Text>
            {E.venture.clamp === x.id ? <Chip tone="tint" label="In the machine" /> : null}
          </View>
          <Text style={{ fontSize: F.f14, color: t.text3 }}>{st.life ? `${st.used.toLocaleString()} of ${st.life.toLocaleString()} ${unitWord(x)}` : `${st.used.toLocaleString()} ${unitWord(x)}`}{st.checkIn != null && st.checkIn > 0 && st.life ? ` · check in ${st.checkIn}` : ''}</Text>
          <Dur t={x} />
        </View>
        {st.tone !== 'ok' || !st.life ? <Text style={{ fontSize: F.f14, fontWeight: '600', color: st.tone === 'bad' ? t.danger : st.tone === 'warn' ? t.warn : t.text3 }}>{st.label}</Text> : null}
        <ChevIcon color={t.text3} size={14} />
      </Pressable>
    );
  };
  const split = (list: EquipTool[], key: string) => {
    const a = list.filter(x => usedTool(E, x));
    const rest = list.filter(x => !usedTool(E, x));
    return (
      <WList>
        {a.map(toolRow)}
        {more[key] ? rest.map(toolRow) : null}
        {rest.length ? (
          <Pressable accessibilityRole="button" onPress={() => setMore(o => ({ ...o, [key]: !o[key] }))} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: F.f16, color: t.action }}>{more[key] ? 'Hide the ones you haven’t used' : `${rest.length} more you haven’t used`}</Text>
            <View style={{ transform: [{ rotate: more[key] ? '-90deg' : '90deg' }] }}><ChevIcon color={t.text3} size={14} /></View>
          </Pressable>
        ) : null}
      </WList>
    );
  };
  const taskRow = (x: EquipTask) => {
    const st = taskState(E, x);
    return (
      <View key={x.id} style={{ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
        <WrenchIcon color={t.text2} size={22} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: F.f16, color: t.text }}>{x.name}</Text>
          <Text style={{ fontSize: F.f14, color: t.text3 }}>
            Every {x.unit === 'seam' ? `${seamYd(x.every)} (~${seamBand(shop, x.every)} bandanas)` : `${x.every} ${TASK_U[x.unit]}`} · {st.due ? <Text style={{ fontWeight: '700', color: t.warn }}>due {taskLeft(shop, x, st)}</Text> : 'next ' + taskLeft(shop, x, st)}
          </Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden', marginTop: 6 }}>
            <View style={{ height: 6, borderRadius: 3, width: `${Math.max(2, Math.min(100, (1 - st.p) * 100))}%`, backgroundColor: st.due || st.soon ? t.barA : t.success }} />
          </View>
        </View>
        <Button small kind={st.due ? 'primary' : 'secondary'} title={x.look && st.due ? 'Check' : 'Done'} onPress={() => { taskDone(x.id); showSnack(`${x.name}: done`); }} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${x.name}`} onPress={() => setTask(x.id)} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}><EditIcon color={t.text3} size={18} /></Pressable>
      </View>
    );
  };
  const upkeep = (
    <Sect title="Upkeep" right={dueTasks.length ? <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.warn }}>{dueTasks.length} due</Text> : <LinkText onPress={() => setTask(addTask(m))}>Add a task</LinkText>}>
      <WList>{tasks.length ? tasks.map(taskRow) : <Text style={{ paddingVertical: 16, fontSize: F.f15, color: t.text3 }}>No tasks yet.</Text>}</WList>
    </Sect>
  );
  const learned = b ? toolLearned(b) : null;
  const planned = shop.runs.filter(r => r.status !== 'done' && !r.cut);
  const plannedCuts = planned.reduce((a, r) => a + cutsForRun(shop, r), 0);
  const plannedLine = !b || !bs ? '' : !planned.length ? 'No runs waiting to be cut' : (() => {
    const n = plural(planned.length, 'planned run');
    if (bs.life && bs.used + plannedCuts >= bs.life) return `Wears out during the ${n}: a new blade before you cut them`;
    if (bs.checkIn != null && plannedCuts >= bs.checkIn) return `A check comes due during the ${n}`;
    return `Nothing due in the ${n}`;
  })();
  return (
    <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 820, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 60, gap: 20 }}>
        <PageHead title="Maintenance" right={<HeadBtn label="Add an upkeep task" onPress={() => setTask(addTask(m))}>{c => <PlusIcon color={c} size={22} />}</HeadBtn>} />
        <Segmented fill label="Machine" bare value={m} onChange={setM} options={[['venture', E.venture.name || 'Cricut Venture'], ['sewing', E.sewing.name || 'Sewing machine']]} />
        {m === 'venture' ? (
          <Strip items={[{ v: dueN ? String(dueN) : 'None', l: 'due now', color: dueN ? t.warn : t.success }, { v: bs && bs.checkIn != null ? String(Math.max(0, bs.checkIn)) : '—', l: 'to next check' }, { v: bs && bs.life ? `${Math.round((bs.pct || 0) * 100)}%` : '—', l: 'blade left' }]} />
        ) : (
          <Strip items={[{ v: dueN ? String(dueN) : 'None', l: 'due now', color: dueN ? t.warn : t.success }, { v: `${(E.sewing.mins / 60).toFixed(1)}h`, l: 'sewn' }, { v: seamYd(E.sewing.seam), l: 'of seam' }]} />
        )}
        {m === 'venture' ? (
          <>
            {b && bs ? (
              <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 12 }, shadow(t.dark)]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: t.tint2, alignItems: 'center', justifyContent: 'center' }}><ScissorsIcon color={t.action} size={24} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: F.f13, fontWeight: '600', color: t.text3, textTransform: 'uppercase', letterSpacing: 0.6 }}>In the machine</Text>
                    <Text style={{ fontSize: F.f16, fontWeight: '700', color: t.text }}>{b.name}</Text>
                  </View>
                  <Chip tone={bs.tone === 'ok' ? 'ok' : bs.tone === 'bad' ? 'bad' : 'warn'} label={bs.label} />
                </View>
                <Dur t={b} big />
                <View style={{ flexDirection: 'row' }}>
                  {[[bs.used.toLocaleString(), 'since new'], [bs.checkIn != null ? String(Math.max(0, bs.checkIn)) : '—', 'to next check'], [b.life ? Math.max(0, b.life - bs.used).toLocaleString() : '—', b.life ? `of ${b.life.toLocaleString()} left` : 'no lifespan']].map(([v, l], i) => (
                    <View key={i} style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 22, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>{v}</Text>
                      <Text style={{ fontSize: F.f13, color: t.text3 }}>{l}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><ClockIcon color={t.text3} size={16} /><Text style={{ fontSize: F.f14, color: t.text2 }}>{plannedLine}</Text></View>
                {!bs.used ? <Note style={{ paddingHorizontal: 0 }}>Counts a cut for every bandana and strap you cut.</Note> : null}
                {learned ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Note style={{ paddingHorizontal: 0 }}>Your last {b.history.length} blades lasted about {learned.toLocaleString()} cuts.</Note>
                    {b.life !== learned ? <LinkText onPress={() => { adoptLearned(b.id); showSnack(`Lifespan set to ${learned} cuts`); }}>Use {learned}</LinkText> : null}
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button kind={bs.tone === 'warn' ? 'primary' : 'secondary'} title="Check it" style={{ flex: 1 }} onPress={() => { checkTool(b.id); showSnack('Checked. The next check counts from here'); }} />
                  <Button kind={bs.tone === 'bad' ? 'primary' : 'secondary'} title="Replace" style={{ flex: 1 }} onPress={() => setReplace(b.id)} />
                </View>
                <LinkText onPress={() => setClampOpen(true)}>Change blade</LinkText>
              </View>
            ) : (
              <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 12 }, shadow(t.dark)]}>
                <T style={{ fontWeight: '700' }}>No blade in the machine</T>
                <Button kind="secondary" title="Choose a blade" onPress={() => setClampOpen(true)} />
              </View>
            )}
            {upkeep}
            <Sect title="Blades">{split(E.tools.filter(x => x.kind === 'blade'), 'blade')}</Sect>
            <Sect title="Tools and mats">{split(E.tools.filter(x => x.kind !== 'blade'), 'tool')}</Sect>
          </>
        ) : (
          <>
            <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 12 }, shadow(t.dark)]}>
              <TextInput accessibilityLabel="Machine" value={E.sewing.name} onChangeText={v => setMachineName('sewing', v)} placeholder="Your machine" placeholderTextColor={t.text3}
                style={{ fontSize: 22, fontWeight: '700', color: t.text, borderBottomWidth: 1.5, borderBottomColor: t.line2, borderStyle: 'dashed', paddingVertical: 4, minHeight: 44 }} />
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 40, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>{seamYd(E.sewing.seam)}</Text>
                <Text style={{ fontSize: F.f15, color: t.text3 }}>of seam sewn, about {Math.round(E.sewing.bodies)} bandanas and {Math.round(E.sewing.straps)} straps</Text>
              </View>
              <Note style={{ paddingHorizontal: 0 }}>Estimated from each size’s measurements when runs are finished. {(E.sewing.mins / 60).toFixed(1)} hours at the machine.</Note>
              <WList bg>
                {Object.entries(shop.sizes).filter(([, z]) => z.cw).map(([k, z]) => {
                  const x = seamOf(shop, k);
                  return (
                    <View key={k} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: F.f15, color: t.text }}>{z.name}</Text>
                        <Text style={{ fontSize: F.f13, color: t.text3 }}>Body {x.body.toFixed(1)} yd{x.hasStrap ? ` · strap ${x.strap.toFixed(1)} yd` : ''}</Text>
                      </View>
                      <Text style={{ fontSize: F.f15, color: t.text2 }}>~{x.total.toFixed(1)} yd</Text>
                    </View>
                  );
                })}
              </WList>
              <Note style={{ paddingHorizontal: 0 }}>Each body is sewn round its edge and topstitched, each strap along its length and ends, plus 10% for backstitching and corners. Your checks correct the timing.</Note>
            </View>
            {upkeep}
          </>
        )}
        {E.log.length ? (
          <Sect title="History">
            <WList>{E.log.slice(0, 8).map((l, i) => <View key={i} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, fontSize: F.f15, color: t.text }}>{l.text}</Text><Text style={{ fontSize: F.f14, color: t.text3 }}>{dayLabel(l.day, { month: 'short', day: 'numeric' })}</Text></View>)}</WList>
          </Sect>
        ) : null}
      </View>
      {tool ? <ToolSheet id={tool} onClose={() => setTool(null)} onReplace={() => { setReplace(tool); setTool(null); }} /> : null}
      {replace ? <ReplaceSheet id={replace} onClose={() => setReplace(null)} /> : null}
      {task ? <TaskSheet id={task} onClose={() => setTask(null)} /> : null}
      {clamp ? (
        <Sheet title="Which blade is in the machine?" sub="Cuts count on this blade" onClose={() => setClampOpen(false)}>
          <WList bg>
            {E.tools.filter(x => x.kind === 'blade').map(x => (
              <Pressable key={x.id} accessibilityRole="radio" accessibilityState={{ checked: E.venture.clamp === x.id }} onPress={() => { setClamp(x.id); setClampOpen(false); showSnack(`${x.name} is in the machine`); }} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: E.venture.clamp === x.id ? t.action : t.line2, alignItems: 'center', justifyContent: 'center' }}>{E.venture.clamp === x.id ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.action }} /> : null}</View>
                <Text style={{ flex: 1, fontSize: F.f16, color: t.text }}>{x.name}</Text>
                <Text style={{ fontSize: F.f14, color: t.text3 }}>{x.cuts} cuts</Text>
              </Pressable>
            ))}
          </WList>
        </Sheet>
      ) : null}
    </ScrollView>
  );
}

function ToolSheet({ id, onClose, onReplace }: { id: string; onClose: () => void; onReplace: () => void }) {
  const shop = useShop();
  const x = shop.equip.tools.find(t => t.id === id);
  if (!x) return null;
  const st = toolState(x);
  const learned = toolLearned(x);
  return (
    <Sheet title={x.name} sub={x.use} onClose={onClose} width={560}
      footer={<>
        {x.kind === 'blade' && shop.equip.venture.clamp !== x.id ? <Button kind="secondary" title="Put it in the machine" onPress={() => { setClamp(x.id); onClose(); }} /> : null}
        <Button kind="secondary" title="Check it" onPress={() => { checkTool(x.id); showSnack('Checked'); }} />
        <Button title="Replace" onPress={onReplace} />
      </>}>
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
        <NumField label={`Lasts about (${unitWord(x)})`} value={x.life} onChange={n => editEquipTool(x.id, { life: n || null, est: false })} width={170} />
        {x.kind !== 'tool' ? <NumField label="Check every" value={x.check} onChange={n => editEquipTool(x.id, { check: n || null })} suffix={unitWord(x)} width={170} /> : null}
        <NumField label={`${unitWord(x)[0].toUpperCase()}${unitWord(x).slice(1)} so far`} value={x.cuts} onChange={n => editEquipTool(x.id, { cuts: Math.max(0, Math.round(n || 0)) })} width={150} />
      </View>
      <T s="sub">{st.label}{x.est && x.life ? ' · Cricut’s estimate until your own blades teach it' : ''}</T>
      {learned ? <T s="sub">Your blades have lasted about {learned.toLocaleString()} {unitWord(x)}.</T> : null}
      {x.history.length ? (
        <View style={{ gap: 4 }}>
          <T s="label">Past ones</T>
          {x.history.map((h, i) => <T key={i} s="sub">{dayLabel(h.day, { month: 'short', day: 'numeric', year: 'numeric' })} · {h.cuts.toLocaleString()} {unitWord(x)} · {h.why}</T>)}
        </View>
      ) : null}
    </Sheet>
  );
}

function ReplaceSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const shop = useShop();
  const x = shop.equip.tools.find(t => t.id === id);
  const [why, setWhy] = useState(WHY[0]);
  if (!x) return null;
  return (
    <Sheet title={`Replace the ${x.name}`} sub={`It did ${x.cuts.toLocaleString()} ${unitWord(x)}`} onClose={onClose} footer={<><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title="Put in a new one" onPress={() => { replaceTool(x.id, why); onClose(); showSnack(`New ${x.name.toLowerCase()} in. Counting from zero`); }} /></>}>
      <T s="label">Why?</T>
      <View style={{ gap: 8 }}>
        {WHY.map(w => <Button key={w} kind={why === w ? 'primary' : 'secondary'} small title={w} onPress={() => setWhy(w)} />)}
      </View>
      <T s="small">What each blade lasts is remembered, so after two the app can suggest a lifespan from your own cutting. Ones that chipped or broke aren’t counted.</T>
    </Sheet>
  );
}

function TaskSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const shop = useShop();
  const x = shop.equip.tasks.find(t => t.id === id);
  if (!x) return null;
  const units: [TaskUnit, string][] = x.machine === 'venture' ? [['mats', 'Mats cut'], ['days', 'Days']] : [['seam', 'Yards of seam'], ['hours', 'Hours sewn'], ['days', 'Days']];
  return (
    <Sheet title={x.name || 'Task'} sub={x.machine === 'venture' ? shop.equip.venture.name : shop.equip.sewing.name} onClose={onClose}
      footer={<><Button kind="danger" small title="Delete task" onPress={() => { deleteTask(x.id); onClose(); }} /><Button title="Done" onPress={onClose} /></>}>
      <Field label="Task" value={x.name} onChange={v => editTask(x.id, { name: v })} />
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <NumField label="Every" value={x.every} onChange={n => editTask(x.id, { every: Math.max(1, n || 1) })} width={120} />
        <View style={{ gap: 4 }}>
          <T s="label">Counted in</T>
          <Select label="Counted in" width={180} value={x.unit} options={units} onChange={v => editTask(x.id, { unit: v, last: v === 'days' ? new Date().toISOString().slice(0, 10) : v === 'mats' ? shop.equip.venture.mats : v === 'seam' ? shop.equip.sewing.seam : shop.equip.sewing.mins })} />
        </View>
      </View>
      <Segmented label="When it comes up" value={x.look ? 'look' : 'do'} onChange={v => editTask(x.id, { look: v === 'look' })} options={[['do', 'Do it'], ['look', 'Take a look']]} />
      <Field label="Why" value={x.why} onChange={v => editTask(x.id, { why: v })} multiline />
    </Sheet>
  );
}
