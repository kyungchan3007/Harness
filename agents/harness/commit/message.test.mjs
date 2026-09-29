import { describe, expect, it } from "vitest";
import { checkMessage, insertSection, isExempt } from "./message.mjs";

const FULL = `feat(0017): 지침서

- 변경 내용

[허점]
- 커밋 전 메시지는 게이트가 못 본다

[보완]
- CI에서도 검사

[컨텍스트·토큰]
- 토큰: 입력 1k

Co-Authored-By: Claude <noreply@anthropic.com>
`;

describe("커밋 메시지 규칙", () => {
  it("세 섹션이 모두 채워지면 통과", () => {
    expect(checkMessage(FULL)).toEqual([]);
  });

  it("섹션이 없거나 비면 무엇이 문제인지 알려준다", () => {
    expect(checkMessage("feat: x\n\n- 변경")).toEqual(["[허점] 섹션이 없습니다", "[보완] 섹션이 없습니다", "[컨텍스트·토큰] 섹션이 없습니다"]);
    const empty = FULL.replace("- 커밋 전 메시지는 게이트가 못 본다", "- ");
    expect(checkMessage(empty)).toEqual(["[허점] 섹션이 비어 있습니다"]);
  });

  it("같은 줄에 쓴 내용도 인정하고, 트레일러는 섹션 내용으로 보지 않는다", () => {
    const inline = "feat: x\n\n[허점] 없음 — hooks 경로만 확인\n[보완] CI 검사\n[컨텍스트·토큰]\n\nCo-Authored-By: A <a@a>";
    expect(checkMessage(inline)).toEqual(["[컨텍스트·토큰] 섹션이 비어 있습니다"]);
  });

  it("git 주석(#) 줄과 머지·fixup 커밋은 제외한다", () => {
    expect(checkMessage(FULL + "# [허점] 주석\n")).toEqual([]);
    expect(isExempt("Merge pull request #6 from x")).toBe(true);
    expect(checkMessage("fixup! feat: x")).toEqual([]);
  });

  it("[컨텍스트·토큰]을 트레일러 앞에 끼워 넣고, 이미 있으면 그대로 둔다", () => {
    const msg = "feat: x\n\n[허점]\n- a\n\nCo-Authored-By: A <a@a>\n";
    const out = insertSection(msg, "[컨텍스트·토큰]\n- 토큰: 1k");
    expect(out).toBe("feat: x\n\n[허점]\n- a\n\n[컨텍스트·토큰]\n- 토큰: 1k\n\nCo-Authored-By: A <a@a>\n");
    expect(insertSection(out, "[컨텍스트·토큰]\n- 다른 값")).toBe(out);
    expect(insertSection("feat: x", "[컨텍스트·토큰]\n- t")).toBe("feat: x\n\n[컨텍스트·토큰]\n- t\n");
  });
});
