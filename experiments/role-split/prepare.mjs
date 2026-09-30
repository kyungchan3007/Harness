// 실행용 복사본 만들기 — node experiments/role-split/prepare.mjs [폴더] [--ref 커밋]
import { prepareCopy } from "./lib.mjs";

const args = process.argv.slice(2);
const refAt = args.indexOf("--ref");
const ref = refAt >= 0 ? args.splice(refAt, 2)[1] : "HEAD";
const { dir, leaks } = prepareCopy({ ref, dest: args[0] });

if (leaks.length > 0) {
  console.error(`❌ 누출 ${leaks.length}건 — 이 복사본으로 실험하지 마세요: ${dir}`);
  for (const l of leaks) console.error(`  ${l.where}  ${l.pattern}  ${l.text}`);
  process.exit(1);
}
console.log(`✅ 복사본 준비 완료 (누출 없음, 커밋 1개): ${dir}`);
