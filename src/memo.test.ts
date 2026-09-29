import { describe, expect, it } from "vitest";
import { MemoStore, MemoValidationError } from "./memo.js";

describe("MemoStore", () => {
  it("메모를 만들고 조회한다", () => {
    const store = new MemoStore(() => new Date("2026-01-01"));
    const memo = store.create({ title: "  첫 메모 ", body: "내용" });

    expect(memo.title).toBe("첫 메모");
    expect(store.get(memo.id)).toEqual(memo);
  });

  it("빈 제목과 100자 초과 제목을 거부한다", () => {
    const store = new MemoStore();
    expect(() => store.create({ title: "   " })).toThrow(MemoValidationError);
    expect(() => store.create({ title: "a".repeat(101) })).toThrow(MemoValidationError);
  });

  it("생성 순서대로 목록을 돌려주고 삭제할 수 있다", () => {
    let t = 0;
    const store = new MemoStore(() => new Date(++t));
    const a = store.create({ title: "a" });
    const b = store.create({ title: "b" });

    expect(store.list().map((m) => m.id)).toEqual([a.id, b.id]);
    expect(store.remove(a.id)).toBe(true);
    expect(store.remove(a.id)).toBe(false);
    expect(store.list()).toHaveLength(1);
  });
});
