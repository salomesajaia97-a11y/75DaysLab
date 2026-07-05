// 75DaysLab flat-design exercise Lottie generator.
// One rig, FK-baked keyframes -> guaranteed style consistency. Owned assets.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const OUT = process.argv[2] || '.'
const rad = d => (d * Math.PI) / 180

// ---- palette ------------------------------------------------------------
const C = (r, g, b) => ({ a: 0, k: [r, g, b, 1] })
const PAL = {
  male: {
    skin: C(0.969, 0.773, 0.627),
    hair: C(0.18, 0.12, 0.07),
    shirt: C(0.267, 0.38, 0.933),   // blue
    short: C(0.102, 0.114, 0.176),  // navy
    shoe: C(0.15, 0.15, 0.15),
    ponytail: false,
    hairD: 66,
  },
  female: {
    skin: C(0.98, 0.804, 0.667),
    hair: C(0.29, 0.13, 0.09),
    shirt: C(0.925, 0.35, 0.55),    // magenta
    short: C(0.235, 0.176, 0.32),   // plum
    shoe: C(0.86, 0.86, 0.92),
    ponytail: true,
    hairD: 62,
  },
}
const BG = C(0.937, 0.949, 1)
const FLOOR = C(0.82, 0.839, 0.89)

// ---- rig dimensions -----------------------------------------------------
const TORSO_LEN = 88, TORSO_W = 46
const NECK_LEN = 16, NECK_W = 13
const THIGH_LEN = 84, THIGH_W = 22
const SHIN_LEN = 76, SHIN_W = 18
const ARM_LEN = 78, ARM_W = 15
const HEAD_D = 62, HAND_D = 18
const HIP_HALF = 13, SHO_HALF = 20, HEAD_GAP = 54

// segment from joint J, length len, angle theta (deg, 0=straight down, CCW+)
function seg(J, len, theta) {
  const t = rad(theta)
  const dx = Math.sin(t), dy = Math.cos(t)
  return {
    mid: [J[0] + 0.5 * len * dx, J[1] + 0.5 * len * dy],
    end: [J[0] + len * dx, J[1] + len * dy],
    r: -theta,
  }
}
const along = (J, len, theta) => seg(J, len, theta).end

// ---- pose -> absolute part transforms -----------------------------------
const BASE = {
  hip: [250, 276], torso: 180,
  lThigh: -3, rThigh: 3, lShin: -1, rShin: 1,
  lArm: -12, rArm: 12, footL: 0, footR: 0,
}
function solve(P) {
  const p = { ...BASE, ...P }
  const H = p.hip
  const t = seg(H, TORSO_LEN, p.torso)
  const S = t.end
  const neck = seg(S, NECK_LEN, p.torso)
  const head = along(S, HEAD_GAP, p.torso)
  const dxT = Math.sin(rad(p.torso)), dyT = Math.cos(rad(p.torso))
  const hipL = [H[0] - HIP_HALF, H[1]], hipR = [H[0] + HIP_HALF, H[1]]
  const shoL = [S[0] - SHO_HALF, S[1]], shoR = [S[0] + SHO_HALF, S[1]]
  const lThigh = seg(hipL, THIGH_LEN, p.lThigh)
  const rThigh = seg(hipR, THIGH_LEN, p.rThigh)
  const lShin = seg(lThigh.end, SHIN_LEN, p.lShin)
  const rShin = seg(rThigh.end, SHIN_LEN, p.rShin)
  const lArm = seg(shoL, ARM_LEN, p.lArm)
  const rArm = seg(shoR, ARM_LEN, p.rArm)
  return {
    Torso: { p: t.mid, r: t.r }, Neck: { p: neck.mid, r: neck.r },
    Head: { p: head, r: 0 }, Hair: { p: [head[0] - dxT * 6, head[1] - dyT * 6], r: 0 },
    Ponytail: { p: [head[0] - dxT * 22, head[1] - dyT * 22], r: t.r },
    LThigh: { p: lThigh.mid, r: lThigh.r }, RThigh: { p: rThigh.mid, r: rThigh.r },
    LShin: { p: lShin.mid, r: lShin.r }, RShin: { p: rShin.mid, r: rShin.r },
    LFoot: { p: [lShin.end[0], lShin.end[1] + 5], r: p.footL },
    RFoot: { p: [rShin.end[0], rShin.end[1] + 5], r: p.footR },
    LArm: { p: lArm.mid, r: lArm.r }, RArm: { p: rArm.mid, r: rArm.r },
    LHand: { p: lArm.end, r: 0 }, RHand: { p: rArm.end, r: 0 },
  }
}

// ---- keyframe helpers ---------------------------------------------------
const EASE = { i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } }
function propScalar(times, vals) {
  if (vals.every(v => Math.abs(v - vals[0]) < 0.01)) return { a: 0, k: vals[0] }
  return { a: 1, k: times.map((t, i) => (i < times.length - 1 ? { ...EASE, t, s: [vals[i]] } : { t, s: [vals[i]] })) }
}
function propPos(times, pts) {
  const same = pts.every(pt => Math.abs(pt[0] - pts[0][0]) < 0.01 && Math.abs(pt[1] - pts[0][1]) < 0.01)
  if (same) return { a: 0, k: [pts[0][0], pts[0][1], 0] }
  return {
    a: 1, k: times.map((t, i) =>
      i < times.length - 1
        ? { ...EASE, t, s: [pts[i][0], pts[i][1], 0], to: [0, 0, 0], ti: [0, 0, 0] }
        : { t, s: [pts[i][0], pts[i][1], 0] }),
  }
}

// ---- layer builders -----------------------------------------------------
let INDC
function shapeLayer(nm, posProp, rotProp, shapes) {
  return {
    ddd: 0, ind: INDC--, ty: 4, nm, sr: 1,
    ks: { o: { a: 0, k: 100 }, r: rotProp, p: posProp, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } },
    ao: 0, shapes, ip: 0, op: 60, st: 0, bm: 0,
  }
}
const grp = (items) => [{ ty: 'gr', nm: 'G', it: [...items, { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 }, nm: 'T' }] }]
const rect = (w, h, r, col) => grp([{ ty: 'rc', d: 1, s: { a: 0, k: [w, h] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: r }, nm: 'R' }, { ty: 'fl', c: col, o: { a: 0, k: 100 }, r: 1, nm: 'F' }])
const ell = (w, h, col) => grp([{ ty: 'el', d: 1, s: { a: 0, k: [w, h] }, p: { a: 0, k: [0, 0] }, nm: 'E' }, { ty: 'fl', c: col, o: { a: 0, k: 100 }, r: 1, nm: 'F' }])

// static-position layer (bg/floor)
function staticLayer(nm, pos, shapes) {
  return shapeLayer(nm, { a: 0, k: [...pos, 0] }, { a: 0, k: 0 }, shapes)
}

// ---- build one animation ------------------------------------------------
function build(name, frames, pal) {
  INDC = 40
  const times = frames.map(f => f.t)
  const solved = frames.map(f => solve(f.pose))
  const partProp = (part, key) => key === 'p'
    ? propPos(times, solved.map(s => s[part].p))
    : propScalar(times, solved.map(s => s[part].r))
  const part = (part, shapes) => shapeLayer(part, partProp(part, 'p'), partProp(part, 'r'), shapes)

  const layers = [
    staticLayer('BG', [250, 250], grp([{ ty: 'el', d: 1, s: { a: 0, k: [484, 484] }, p: { a: 0, k: [0, 0] }, nm: 'E' }, { ty: 'fl', c: BG, o: { a: 0, k: 100 }, r: 1, nm: 'F' }])),
    staticLayer('Floor', [250, 452], rect(340, 8, 4, FLOOR)),
    part('LFoot', rect(30, 14, 0, pal.shoe)),
    part('RFoot', rect(30, 14, 0, pal.shoe)),
    part('LShin', rect(SHIN_W, SHIN_LEN, 4, pal.skin)),
    part('RShin', rect(SHIN_W, SHIN_LEN, 4, pal.skin)),
    part('LThigh', rect(THIGH_W, THIGH_LEN, 4, pal.short)),
    part('RThigh', rect(THIGH_W, THIGH_LEN, 4, pal.short)),
    part('LArm', rect(ARM_W, ARM_LEN, 4, pal.skin)),
    part('RArm', rect(ARM_W, ARM_LEN, 4, pal.skin)),
    part('LHand', ell(HAND_D, HAND_D, pal.skin)),
    part('RHand', ell(HAND_D, HAND_D, pal.skin)),
    part('Torso', rect(TORSO_W, TORSO_LEN, 6, pal.shirt)),
    part('Neck', rect(NECK_W, NECK_LEN, 3, pal.skin)),
  ]
  if (pal.ponytail) layers.push(part('Ponytail', ell(26, 40, pal.hair)))
  layers.push(part('Hair', ell(pal.hairD, pal.hairD, pal.hair)))
  layers.push(part('Head', ell(HEAD_D, HEAD_D, pal.skin)))

  return { v: '5.7.4', fr: 30, ip: 0, op: 60, w: 500, h: 500, nm: name, ddd: 0, assets: [], layers, markers: [] }
}

// ---- exercise pose library ---------------------------------------------
// theta: 0=down, 180=up, 90=points right, -90=points left. CCW positive.
const stand = {}                     // = BASE
const armsUp = { lArm: -165, rArm: 165 }
const EX = {
  // BEGINNER
  squat: { level: 'beginner', focus: ['lower', 'full'], name: 'Squat', frames: [
    { t: 0, pose: { lArm: -92, rArm: 92 } },
    { t: 30, pose: { hip: [250, 312], torso: 168, lThigh: -34, rThigh: 34, lShin: 22, rShin: -22, lArm: -96, rArm: 96 } },
    { t: 60, pose: { lArm: -92, rArm: 92 } }] },
  'wall-pushup': { level: 'beginner', focus: ['upper', 'full'], name: 'Wall Push-up', frames: [
    { t: 0, pose: { hip: [232, 268], torso: 150, lArm: 96, rArm: 78 } },
    { t: 30, pose: { hip: [250, 274], torso: 158, lArm: 120, rArm: 100 } },
    { t: 60, pose: { hip: [232, 268], torso: 150, lArm: 96, rArm: 78 } }] },
  'glute-bridge': { level: 'beginner', focus: ['lower', 'core'], name: 'Glute Bridge', frames: [
    { t: 0, pose: { hip: [236, 398], torso: 98, lThigh: 42, rThigh: 46, lShin: 132, rShin: 136, lArm: 8, rArm: -8 } },
    { t: 30, pose: { hip: [236, 366], torso: 108, lThigh: 30, rThigh: 34, lShin: 128, rShin: 132, lArm: 8, rArm: -8 } },
    { t: 60, pose: { hip: [236, 398], torso: 98, lThigh: 42, rThigh: 46, lShin: 132, rShin: 136, lArm: 8, rArm: -8 } }] },
  'bird-dog': { level: 'beginner', focus: ['core', 'full'], name: 'Bird Dog', frames: [
    { t: 0, pose: { hip: [248, 336], torso: 92, lArm: 2, rArm: 92, lThigh: -92, lShin: -92, rThigh: -2, rShin: -92 } },
    { t: 30, pose: { hip: [248, 336], torso: 92, lArm: 92, rArm: 2, lThigh: -2, lShin: -92, rThigh: -92, rShin: -92 } },
    { t: 60, pose: { hip: [248, 336], torso: 92, lArm: 2, rArm: 92, lThigh: -92, lShin: -92, rThigh: -2, rShin: -92 } }] },
  'march-in-place': { level: 'beginner', focus: ['cardio', 'lower'], name: 'March in Place', frames: [
    { t: 0, pose: { lThigh: -46, lShin: -6, rThigh: 4, rShin: 2, lArm: 30, rArm: -30 } },
    { t: 30, pose: { rThigh: 46, rShin: 6, lThigh: -4, lShin: -2, lArm: -30, rArm: 30 } },
    { t: 60, pose: { lThigh: -46, lShin: -6, rThigh: 4, rShin: 2, lArm: 30, rArm: -30 } }] },
  'side-steps': { level: 'beginner', focus: ['cardio', 'lower'], name: 'Side Steps', frames: [
    { t: 0, pose: { hip: [212, 262], lThigh: -22, rThigh: 6, lArm: -34, rArm: 20 } },
    { t: 30, pose: { hip: [288, 262], lThigh: -6, rThigh: 22, lArm: -20, rArm: 34 } },
    { t: 60, pose: { hip: [212, 262], lThigh: -22, rThigh: 6, lArm: -34, rArm: 20 } }] },

  // INTERMEDIATE
  pushup: { level: 'intermediate', focus: ['upper', 'core'], name: 'Push-up', frames: [
    { t: 0, pose: { hip: [236, 350], torso: 92, lThigh: -92, rThigh: -96, lShin: -92, rShin: -96, lArm: 6, rArm: -6 } },
    { t: 30, pose: { hip: [236, 382], torso: 92, lThigh: -92, rThigh: -96, lShin: -92, rShin: -96, lArm: 32, rArm: -32 } },
    { t: 60, pose: { hip: [236, 350], torso: 92, lThigh: -92, rThigh: -96, lShin: -92, rShin: -96, lArm: 6, rArm: -6 } }] },
  'walking-lunge': { level: 'intermediate', focus: ['lower', 'full'], name: 'Walking Lunge', frames: [
    { t: 0, pose: { hip: [250, 300], lThigh: 40, rThigh: -40, lShin: -34, rShin: 40, lArm: 26, rArm: -26 } },
    { t: 30, pose: { hip: [250, 320], lThigh: 50, rThigh: -50, lShin: -46, rShin: 52, lArm: -26, rArm: 26 } },
    { t: 60, pose: { hip: [250, 300], lThigh: 40, rThigh: -40, lShin: -34, rShin: 40, lArm: 26, rArm: -26 } }] },
  plank: { level: 'intermediate', focus: ['core', 'full'], name: 'Plank', frames: [
    { t: 0, pose: { hip: [236, 356], torso: 92, lThigh: -92, rThigh: -96, lShin: -92, rShin: -96, lArm: 4, rArm: -4 } },
    { t: 30, pose: { hip: [236, 360], torso: 91, lThigh: -92, rThigh: -96, lShin: -92, rShin: -96, lArm: 4, rArm: -4 } },
    { t: 60, pose: { hip: [236, 356], torso: 92, lThigh: -92, rThigh: -96, lShin: -92, rShin: -96, lArm: 4, rArm: -4 } }] },
  'step-up': { level: 'intermediate', focus: ['lower', 'cardio'], name: 'Step Up', frames: [
    { t: 0, pose: { hip: [250, 288], lThigh: -50, lShin: 30, rThigh: 4, rShin: 2, lArm: 24, rArm: -24 } },
    { t: 30, pose: { hip: [250, 244], lThigh: -18, lShin: 8, rThigh: 8, rShin: 4, lArm: -18, rArm: 18 } },
    { t: 60, pose: { hip: [250, 288], lThigh: -50, lShin: 30, rThigh: 4, rShin: 2, lArm: 24, rArm: -24 } }] },
  'mountain-climbers': { level: 'intermediate', focus: ['cardio', 'core'], name: 'Mountain Climbers', frames: [
    { t: 0, pose: { hip: [236, 352], torso: 92, lThigh: -34, rThigh: -96, lShin: -72, rShin: -96, lArm: 6, rArm: -6 } },
    { t: 30, pose: { hip: [236, 352], torso: 92, lThigh: -96, rThigh: -34, lShin: -96, rShin: -72, lArm: 6, rArm: -6 } },
    { t: 60, pose: { hip: [236, 352], torso: 92, lThigh: -34, rThigh: -96, lShin: -72, rShin: -96, lArm: 6, rArm: -6 } }] },
  'fire-hydrant': { level: 'intermediate', focus: ['lower', 'core'], name: 'Fire Hydrant', frames: [
    { t: 0, pose: { hip: [248, 336], torso: 92, lArm: 2, rArm: -2, lThigh: 2, lShin: -92, rThigh: -2, rShin: -92 } },
    { t: 30, pose: { hip: [248, 336], torso: 92, lArm: 2, rArm: -2, lThigh: 2, lShin: -92, rThigh: -50, rShin: -74 } },
    { t: 60, pose: { hip: [248, 336], torso: 92, lArm: 2, rArm: -2, lThigh: 2, lShin: -92, rThigh: -2, rShin: -92 } }] },

  // ADVANCED
  burpee: { level: 'advanced', focus: ['full', 'cardio'], name: 'Burpee', frames: [
    { t: 0, pose: armsUp },
    { t: 20, pose: { hip: [250, 316], torso: 166, lThigh: -32, rThigh: 32, lShin: 20, rShin: -20, lArm: -70, rArm: 70 } },
    { t: 40, pose: { hip: [236, 352], torso: 92, lThigh: -92, rThigh: -96, lShin: -92, rShin: -96, lArm: 6, rArm: -6 } },
    { t: 60, pose: armsUp }] },
  'jump-squat': { level: 'advanced', focus: ['lower', 'cardio'], name: 'Jump Squat', frames: [
    { t: 0, pose: { hip: [250, 314], torso: 168, lThigh: -32, rThigh: 32, lShin: 22, rShin: -22, lArm: -60, rArm: 60 } },
    { t: 30, pose: { hip: [250, 210], lThigh: -6, rThigh: 6, lShin: -3, rShin: 3, lArm: -172, rArm: 172, footL: -20, footR: 20 } },
    { t: 60, pose: { hip: [250, 314], torso: 168, lThigh: -32, rThigh: 32, lShin: 22, rShin: -22, lArm: -60, rArm: 60 } }] },
  'pike-pushup': { level: 'advanced', focus: ['upper', 'core'], name: 'Pike Push-up', frames: [
    { t: 0, pose: { hip: [250, 250], torso: 52, lThigh: -52, rThigh: -56, lShin: -24, rShin: -28, lArm: 20, rArm: -20 } },
    { t: 30, pose: { hip: [250, 262], torso: 52, lThigh: -52, rThigh: -56, lShin: -24, rShin: -28, lArm: 46, rArm: -46 } },
    { t: 60, pose: { hip: [250, 250], torso: 52, lThigh: -52, rThigh: -56, lShin: -24, rShin: -28, lArm: 20, rArm: -20 } }] },
  'high-knees': { level: 'advanced', focus: ['cardio', 'core'], name: 'High Knees', frames: [
    { t: 0, pose: { lThigh: -78, lShin: -30, rThigh: 6, rShin: 3, lArm: 40, rArm: -40 } },
    { t: 15, pose: { rThigh: 78, rShin: 30, lThigh: -6, lShin: -3, lArm: -40, rArm: 40 } },
    { t: 30, pose: { lThigh: -78, lShin: -30, rThigh: 6, rShin: 3, lArm: 40, rArm: -40 } },
    { t: 45, pose: { rThigh: 78, rShin: 30, lThigh: -6, lShin: -3, lArm: -40, rArm: 40 } },
    { t: 60, pose: { lThigh: -78, lShin: -30, rThigh: 6, rShin: 3, lArm: 40, rArm: -40 } }] },
  'jump-lunge': { level: 'advanced', focus: ['lower', 'cardio'], name: 'Jump Lunge', frames: [
    { t: 0, pose: { hip: [250, 316], lThigh: 46, rThigh: -46, lShin: -40, rShin: 46, lArm: 30, rArm: -30 } },
    { t: 30, pose: { hip: [250, 226], lThigh: -8, rThigh: 8, lArm: -150, rArm: 150, footL: -18, footR: 18 } },
    { t: 60, pose: { hip: [250, 316], lThigh: -46, rThigh: 46, lShin: 46, rShin: -40, lArm: -30, rArm: 30 } }] },
  'bicycle-crunch': { level: 'advanced', focus: ['core'], name: 'Bicycle Crunch', frames: [
    { t: 0, pose: { hip: [238, 356], torso: 74, lThigh: -132, rThigh: -70, lShin: -110, rShin: -150, lArm: -150, rArm: -100 } },
    { t: 30, pose: { hip: [238, 356], torso: 74, lThigh: -70, rThigh: -132, lShin: -150, rShin: -110, lArm: -100, rArm: -150 } },
    { t: 60, pose: { hip: [238, 356], torso: 74, lThigh: -132, rThigh: -70, lShin: -110, rShin: -150, lArm: -150, rArm: -100 } }] },
}

// ---- emit ---------------------------------------------------------------
const LEVELS = { beginner: [], intermediate: [], advanced: [] }
const manifest = []
for (const [slug, def] of Object.entries(EX)) {
  for (const gender of ['male', 'female']) {
    const data = build(def.name, def.frames, PAL[gender])
    const json = JSON.stringify(data)
    const genderFile = `${OUT}/${gender}/${slug}.json`
    const levelFile = `${OUT}/${def.level}/${slug}-${gender}.json`
    for (const f of [genderFile, levelFile]) { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, json) }
    manifest.push({ slug, name: def.name, level: def.level, focus: def.focus, gender, bytes: json.length })
  }
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2))
console.log(`generated ${manifest.length} files across ${Object.keys(EX).length} exercises`)
