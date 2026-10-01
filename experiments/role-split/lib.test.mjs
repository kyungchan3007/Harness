import { describe, expect, it } from "vitest";
import { dropTaskRows, summarize, trapIds } from "./lib.mjs";

describe("dropTaskRows — 실험 태스크 행 지우기", () => {
  it("제외 태스크를 가리키는 표 행만 지운다", () => {
    const text = [
      "| ID | 제목 |",
      "| 0003 | 쿠폰 규칙 |",
      "| 0014 | 검사자 판정 |",
      "| 2026-09-30 | 0015 채점 | 결과 |",
      "| 2026-09-30 | 0020 복기 (#16 참고) |",
      "0014는 표 밖이라 남는다",
    ].join("\n");
    expect(dropTaskRows(text, ["0014", "0015", "0016"]).split("\n")).toEqual([
      "| ID | 제목 |",
      "| 0003 | 쿠폰 규칙 |",
      "| 2026-09-30 | 0020 복기 (#16 참고) |",
      "0014는 표 밖이라 남는다",
    ]);
  });

  it("더 긴 숫자의 일부는 태스크 번호로 보지 않는다", () => {
    expect(dropTaskRows("| 100140 | x |", ["0014"])).toBe("| 100140 | x |");
  });
});

describe("summarize — 함정별 채점", () => {
  const ids = ["T01", "T02", "T03"];

  it("통과·실패를 함정 번호로 모은다", () => {
    const json = {
      testResults: [
        {
          assertionResults: [
            { title: "T01 버림", status: "passed" },
            { title: "T02 반올림 아님", status: "failed" },
          ],
        },
      ],
    };
    expect(summarize(json, ids)).toEqual({
      passed: 1,
      total: 3,
      failed: ["T02", "T03"],
      traps: { T01: true, T02: false, T03: false },
    });
  });

  it("결과가 없으면(구현 파일 없음 등) 전부 실패", () => {
    expect(summarize(null, ids).passed).toBe(0);
  });
});

describe("trapIds", () => {
  it("테스트 이름의 T번호를 순서대로 읽는다", () => {
    expect(trapIds('it("T01 a", () => {});\nit("T02 b", () => {});')).toEqual(["T01", "T02"]);
  });

  it("실제 채점 테스트는 약 20개이고 번호가 겹치지 않는다", () => {
    const ids = trapIds();
    expect(ids.length).toBeGreaterThanOrEqual(15);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
