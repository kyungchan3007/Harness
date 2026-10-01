// 채점 기준 자체 검증 — node experiments/role-split/selfcheck.mjs
// 0) 복사본 시작 상태 게이트 통과  1) 구현 없음 → 전부 실패  2) 정답 구현 → 전부 통과 + 타입 검사 통과
// 3) 함정별로 일부러 틀린 구현(정답 코드 바꿔치기) → 그 함정 테스트가 실패해야 한다
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { IMPL_PATH, ORACLE_FILE, ORACLE_PATH, REFERENCE_FILE, WORKTREE, prepareCopy, scoreCopy } from "./lib.mjs";

/** 틀린 구현 — find를 replace로 바꾼 정답 코드. expect의 함정 테스트가 모두 실패해야 한다 */
export const MUTANTS = [
  { name: "버림 대신 올림", find: "Math.floor((base * coupon.value) / 100)", replace: "Math.ceil((base * coupon.value) / 100)", expect: ["T01"] },
  { name: "상품 쿠폰을 주문 전체 금액에 적용", find: "itemDiscount += discountOf(c, line.unitPrice * line.quantity, subtotal);", replace: "itemDiscount += discountOf(c, subtotal, subtotal) + 0 * line.quantity;", expect: ["T04"] },
  { name: "최소 주문 금액 미달이면 오류", find: "if (coupon.minOrder !== undefined && subtotal < coupon.minOrder) return 0;", replace: "if (coupon.minOrder !== undefined && subtotal < coupon.minOrder) throw new CouponError(\"최소 주문 금액 미달\");", expect: ["T09"] },
  { name: "무료배송을 초과(>)로 판단", find: "return priceCart(items, { discount: itemDiscount + orderDiscount, shippingPolicy });", replace: "const r = priceCart(items, { discount: itemDiscount + orderDiscount, shippingPolicy }); const after = r.subtotal - r.discount; const s = after > shippingPolicy.freeThreshold ? 0 : shippingPolicy.fee; return { ...r, shipping: s, total: after + s };", expect: ["T14"] },
  { name: "할인율 100% 거부", find: "value >= 1 && value <= 100", replace: "value >= 1 && value < 100", expect: ["T20"] },
  { name: "버림 대신 반올림", find: "Math.floor((base * coupon.value) / 100)", replace: "Math.round((base * coupon.value) / 100)", expect: ["T02"] },
  { name: "정액을 기준 금액으로 자르지 않음", find: "Math.min(coupon.value, base)", replace: "coupon.value", expect: ["T05"] },
  { name: "상한 무시", find: "amount = Math.min(amount, coupon.maxDiscount)", replace: "amount = amount", expect: ["T06"] },
  { name: "상한을 항상 적용", find: "if (coupon.maxDiscount !== undefined) amount", replace: "amount = coupon.maxDiscount ?? amount; if (false) amount", expect: ["T07"] },
  { name: "최소 주문 금액 초과(>)로 판단", find: "subtotal < coupon.minOrder", replace: "subtotal <= coupon.minOrder", expect: ["T08"] },
  { name: "최소 주문 금액을 할인 후 금액으로 판단", find: "discountOf(c, orderBase, subtotal)", replace: "discountOf(c, orderBase, orderBase)", expect: ["T10"] },
  { name: "상품 쿠폰을 개당 계산", find: "itemDiscount += discountOf(c, line.unitPrice * line.quantity, subtotal);", replace: "itemDiscount += discountOf(c, line.unitPrice, subtotal) * line.quantity;", expect: ["T03"] },
  { name: "주문 쿠폰 기준을 할인 전 합계로", find: "const orderBase = subtotal - itemDiscount;", replace: "const orderBase = subtotal;", expect: ["T11", "T12"] },
  { name: "목록 순서대로 적용", find: "const orderBase = subtotal - itemDiscount;", replace: "const firstItemAt = coupons.findIndex((c) => c.scope === \"item\"); const orderBase = coupons.findIndex((c) => c.scope === \"order\") < firstItemAt ? subtotal : subtotal - itemDiscount;", expect: ["T12"] },
  { name: "배송비를 할인 전 금액으로", find: "return priceCart(items, { discount: itemDiscount + orderDiscount, shippingPolicy });", replace: "const r = priceCart(items, { shippingPolicy }); const d = itemDiscount + orderDiscount; return { ...r, discount: d, total: r.subtotal - d + r.shipping };", expect: ["T13"] },
  { name: "빈 장바구니에서도 쿠폰 검사", find: "if (items.length === 0) return priceCart(items, { shippingPolicy });\n", replace: "", expect: ["T15"] },
  { name: "중복 쿠폰 허용", find: "if (seen.has(sku)) throw", replace: "if (false) throw", expect: ["T16"] },
  { name: "주문 쿠폰 여러 장 허용", find: "if (orderCoupons.length > 1) throw", replace: "if (false) throw", expect: ["T17"] },
  { name: "없는 상품 쿠폰 무시", find: "if (!items.some((i) => i.sku === sku)) throw new CouponError(`장바구니에 없는 상품입니다: ${sku}`);", replace: "if (!items.some((i) => i.sku === sku)) continue;", expect: ["T18"] },
  { name: "소수 할인율 허용", find: "Number.isInteger(value) && value >= 1", replace: "value >= 1", expect: ["T19"] },
  { name: "입력 목록을 정렬해 바꿈", find: "coupons.forEach(validate);", replace: "(coupons as Coupon[]).sort((a, b) => (a.scope < b.scope ? -1 : 1)); coupons.forEach(validate);", expect: ["T21"] },
];

export function runSelfcheck({ log = console.log } = {}) {
  const reference = readFileSync(REFERENCE_FILE, "utf8");
  const problems = [];
  // 게이트는 커밋 전에 돌기 때문에 HEAD가 아니라 지금 작업 폴더로 만든다 (HEAD로 하면 새로 쓴 파일의 누출을 못 봄 — fix/0015)
  const { dir, leaks } = prepareCopy({ ref: WORKTREE });
  try {
    if (leaks.length > 0) problems.push(`복사본 누출 ${leaks.length}건: ${leaks.map((l) => l.where).join(", ")}`);

    // 시작 상태가 게이트를 통과해야 두 실험군이 같은 깨끗한 출발선에 선다
    const gate = spawnSync("bash", ["agents/harness/evals/checks.sh"], { cwd: dir, encoding: "utf8" });
    log(`  복사본 시작 게이트: ${gate.status === 0 ? "통과" : "실패"}`);
    if (gate.status !== 0) problems.push(`복사본 시작 상태가 게이트 실패: ${gate.stdout.split("\n").filter((l) => l.includes("FAIL")).join(" / ")}`);

    const empty = scoreCopy(dir);
    log(`  구현 없음: ${empty.passed}/${empty.total}`);
    if (empty.passed !== 0) problems.push(`구현이 없는데 ${empty.passed}개 통과`);
    if (empty.total < 15) problems.push(`채점 테스트가 너무 적음: ${empty.total}개`);

    const impl = join(dir, IMPL_PATH);
    writeFileSync(impl, reference);
    const ref = scoreCopy(dir);
    log(`  정답 구현: ${ref.passed}/${ref.total}`);
    if (ref.passed !== ref.total) problems.push(`정답 구현이 실패: ${ref.failed.join(" ")}`);

    // 정답 + 채점 테스트가 복사본의 타입 검사를 통과해야 과제 문장의 함수 모양과 맞는 것
    writeFileSync(join(dir, ORACLE_PATH), readFileSync(ORACLE_FILE, "utf8"));
    const tsc = spawnSync("pnpm", ["exec", "tsc", "--noEmit"], { cwd: dir, encoding: "utf8" });
    rmSync(join(dir, ORACLE_PATH));
    log(`  타입 검사: ${tsc.status === 0 ? "통과" : "실패"}`);
    if (tsc.status !== 0) problems.push(`타입 검사 실패: ${tsc.stdout.trim().split("\n").slice(0, 3).join(" / ")}`);

    const caught = new Set();
    for (const m of MUTANTS) {
      if (!reference.includes(m.find)) {
        problems.push(`틀린 구현 "${m.name}": 바꿔치기 대상이 정답 코드에 없음`);
        continue;
      }
      writeFileSync(impl, reference.replace(m.find, m.replace));
      const r = scoreCopy(dir);
      const missed = m.expect.filter((id) => r.traps[id]);
      m.expect.forEach((id) => caught.add(id));
      log(`  ${missed.length ? "❌" : "✅"} ${m.name}: 실패 ${r.failed.join(" ") || "없음"}`);
      if (missed.length) problems.push(`틀린 구현 "${m.name}"을 ${missed.join(" ")}가 못 잡음`);
    }
    log(`  틀린 구현으로 확인된 함정: ${caught.size}/${ref.total}`);
    const unproven = Object.keys(ref.traps).filter((id) => !caught.has(id));
    if (unproven.length) problems.push(`틀린 구현으로 확인하지 않은 함정: ${unproven.join(" ")}`);
    return { problems, caught: [...caught].sort(), total: ref.total };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("채점 기준 자체 검증");
  const { problems } = runSelfcheck();
  if (problems.length) {
    for (const p of problems) console.error(`  ❌ ${p}`);
    process.exit(1);
  }
  console.log("  ✅ 채점 기준 정상");
}
