// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.

import { cross, dot, normalize, type M44, type V3 } from "./maths";

/**
 * Unit quaternion stored as [x, y, z, w].
 *
 * Poses use quaternions rather than the Euler triples the animation clips use.
 * `rotateM44` composes in a fixed Z·Y·X order, so twisting a limb to ±90° puts
 * the middle (Y) axis edge-on and collapses the other two — reachable with a
 * shoulder twist, and it makes an interactive drag stick. Accumulating drags as
 * quaternions sidesteps that entirely.
 */
export type Quat = [number, number, number, number];

export function identityQuat(): Quat {
  return [0, 0, 0, 1];
}

export function isIdentityQuat(q: Quat, epsilon = 1e-6): boolean {
  return (
    Math.abs(q[0]) < epsilon &&
    Math.abs(q[1]) < epsilon &&
    Math.abs(q[2]) < epsilon &&
    Math.abs(Math.abs(q[3]) - 1) < epsilon
  );
}

export function normalizeQuat(q: Quat): Quat {
  const length = Math.hypot(q[0], q[1], q[2], q[3]);
  if (length === 0) return identityQuat();
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}

export function quatFromAxisAngle(axis: V3, angle: number): Quat {
  const [x, y, z] = normalize(axis);
  const half = angle / 2;
  const s = Math.sin(half);
  return [x * s, y * s, z * s, Math.cos(half)];
}

/**
 * The shortest rotation taking direction `from` onto direction `to`. This is
 * what makes dragging a limb's end handle feel direct: the limb turns exactly
 * as far as it must to point at the cursor and no further, so no twist creeps
 * in along the way.
 */
export function quatFromUnitVectors(from: V3, to: V3): Quat {
  const a = normalize(from);
  const b = normalize(to);
  const d = dot(a, b);

  // Antiparallel: every rotation axis perpendicular to `a` is equally shortest,
  // so pick one deterministically instead of dividing by a zero-length cross.
  if (d < -1 + 1e-6) {
    let axis = cross([1, 0, 0], a);
    if (Math.hypot(axis[0], axis[1], axis[2]) < 1e-6) {
      axis = cross([0, 1, 0], a);
    }
    return quatFromAxisAngle(axis, Math.PI);
  }

  const c = cross(a, b);
  return normalizeQuat([c[0], c[1], c[2], 1 + d]);
}

/**
 * The rotation taking direction `from` onto direction `to` that carries no
 * twist about `axis` — a pure swing, in the sense
 * {@link swingTwistDecompose} means it.
 *
 * The shortest rotation is not always that. Its axis is perpendicular to
 * `from`, so it is twist-free only while `from` lies along `axis` — true of a
 * limb aimed from the centre of the end it hangs by, and not true of an arm
 * aimed from its shoulder, which sits off to one side. Feeding that shortest
 * rotation to a part whose swing and twist turn about different points leaves
 * the leftover twist to be re-solved against the other pivot, and the hand
 * lands somewhere other than where the drag pointed.
 *
 * Turning about an axis perpendicular to `axis` fixes the whole problem, and
 * there is always one that works: a rotation preserves the component along its
 * own axis, so the axis has to be perpendicular to `from - to` as well, which
 * pins it down to their cross product.
 */
export function swingFromUnitVectors(from: V3, to: V3, axis: V3): Quat {
  const a = normalize(from);
  const b = normalize(to);
  const u = normalize(axis);

  // Along the twist axis the shortest rotation is already twist-free, and it
  // is the better answer: it picks a sensible axis where this one degenerates.
  if (Math.hypot(...cross(u, a)) < 1e-6) return quatFromUnitVectors(a, b);

  const delta: V3 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  let n = cross(u, delta);
  // `from` and `to` apart only along the twist axis: every perpendicular axis
  // preserves both components equally, so any of them will do.
  if (Math.hypot(...n) < 1e-6) n = cross(u, a);
  n = normalize(n);

  // Both vectors keep the same component along `n`, so what is left of each is
  // the same length and the sweep between those two is the turn.
  const pa: V3 = [a[0] - dot(a, n) * n[0], a[1] - dot(a, n) * n[1], a[2] - dot(a, n) * n[2]];
  const pb: V3 = [b[0] - dot(b, n) * n[0], b[1] - dot(b, n) * n[1], b[2] - dot(b, n) * n[2]];
  if (Math.hypot(...pa) < 1e-6 || Math.hypot(...pb) < 1e-6) return identityQuat();

  return quatFromAxisAngle(n, Math.atan2(dot(cross(pa, pb), n), dot(pa, pb)));
}

/**
 * Hamilton product. Follows the same convention as `multiplyM44`: the result
 * applies `b` first, then `a`.
 */
export function multiplyQuat(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function conjugateQuat(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

/** Rotates a vector by a quaternion. */
export function rotateV3ByQuat(q: Quat, v: V3): V3 {
  const [x, y, z, w] = q;
  // t = 2 * (q.xyz × v)
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

/** Column-major rotation matrix, matching the convention in `maths.ts`. */
export function quatToM44(q: Quat): M44 {
  const [x, y, z, w] = normalizeQuat(q);
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;

  return [
    1 - (yy + zz),
    xy + wz,
    xz - wy,
    0,

    xy - wz,
    1 - (xx + zz),
    yz + wx,
    0,

    xz + wy,
    yz - wx,
    1 - (xx + yy),
    0,

    0,
    0,
    0,
    1,
  ];
}

/**
 * Euler angles (radians) in the same Z·Y·X order `rotateM44` uses, so an
 * animation clip keyframe and its quaternion form describe the same rotation.
 */
export function quatFromEuler(
  alpha: number,
  beta: number,
  gamma: number,
): Quat {
  const cx = Math.cos(alpha / 2);
  const sx = Math.sin(alpha / 2);
  const cy = Math.cos(beta / 2);
  const sy = Math.sin(beta / 2);
  const cz = Math.cos(gamma / 2);
  const sz = Math.sin(gamma / 2);

  // Rz · Ry · Rx
  return [
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz,
  ];
}

/** Spherical linear interpolation, taking the shorter arc. */
export function slerpQuat(a: Quat, b: Quat, t: number): Quat {
  let cosHalfTheta = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

  let end = b;
  if (cosHalfTheta < 0) {
    end = [-b[0], -b[1], -b[2], -b[3]];
    cosHalfTheta = -cosHalfTheta;
  }

  // Nearly parallel — lerp and renormalize to avoid dividing by ~0.
  if (cosHalfTheta > 0.9995) {
    return normalizeQuat([
      a[0] + (end[0] - a[0]) * t,
      a[1] + (end[1] - a[1]) * t,
      a[2] + (end[2] - a[2]) * t,
      a[3] + (end[3] - a[3]) * t,
    ]);
  }

  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sin(halfTheta);
  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

  return [
    a[0] * ratioA + end[0] * ratioB,
    a[1] * ratioA + end[1] * ratioB,
    a[2] * ratioA + end[2] * ratioB,
    a[3] * ratioA + end[3] * ratioB,
  ];
}

/**
 * Decomposes a rotation into a twist about `axis` and the remaining swing,
 * such that `swing * twist` reproduces the input. Used to clamp a joint's
 * twist independently of how far it has swung.
 */
export function swingTwistDecompose(
  q: Quat,
  axis: V3,
): { swing: Quat; twist: Quat } {
  const [ax, ay, az] = normalize(axis);
  const projection = q[0] * ax + q[1] * ay + q[2] * az;
  let twist = normalizeQuat([
    ax * projection,
    ay * projection,
    az * projection,
    q[3],
  ]);
  // A 180° swing leaves no twist component to normalize; fall back to identity.
  if (!Number.isFinite(twist[0])) twist = identityQuat();
  const swing = multiplyQuat(q, conjugateQuat(twist));
  return { swing, twist };
}

/**
 * Mirrors a rotation across the body's sagittal plane (the YZ plane), so a
 * posed left arm can be reflected onto the right one. Reflecting a rotation
 * negates the components of its axis that lie *in* the mirror plane.
 */
export function mirrorQuat(rotation: Quat): Quat {
  return [rotation[0], -rotation[1], -rotation[2], rotation[3]];
}

/** Angle in radians represented by a unit quaternion, in [0, π]. */
export function quatAngle(q: Quat): number {
  const w = Math.min(1, Math.abs(normalizeQuat(q)[3]));
  return 2 * Math.acos(w);
}

/**
 * Rescales a rotation so it turns at most `maxAngle` radians about the same
 * axis. Returns the input untouched when it is already within the limit.
 */
export function clampQuatAngle(q: Quat, maxAngle: number): Quat {
  const normalized = normalizeQuat(q);
  const angle = quatAngle(normalized);
  if (angle <= maxAngle) return normalized;
  const sinHalf = Math.sin(angle / 2);
  if (sinHalf < 1e-8) return normalized;
  const axis: V3 = [
    normalized[0] / sinHalf,
    normalized[1] / sinHalf,
    normalized[2] / sinHalf,
  ];
  return quatFromAxisAngle(axis, maxAngle);
}
