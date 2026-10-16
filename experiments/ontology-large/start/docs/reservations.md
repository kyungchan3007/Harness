# 예약 운영

## 예약·소비 (기존)
- 이용 가능량 = 남은 양 − ACTIVE 예약 양의 합(reserved). 예약은 남은 양을 줄이지 않고 이용 가능량만 줄입니다. 이용 가능량보다 많이 예약하면 `INSUFFICIENT`. ACTIVE가 아닌 시료는 `NOT_ACTIVE`.
- `cancel`은 ACTIVE 예약을 `CANCELED`로 바꾸고 잡아 둔 양을 풉니다.
- `consume`은 ACTIVE 예약의 양 전체를 씁니다(남은 양·reserved를 함께 줄이고 consumedQty를 늘림, 예약은 `CONSUMED`). 일부만 쓰는 기능은 없습니다.
- 끝난 예약(`CANCELED`·`CONSUMED`·`EXPIRED`)에 새 이벤트로 `cancel`·`consume`하면 `RESERVATION_CLOSED`.

## 논리 시각·만료
- 논리 시각(`now`)은 0에서 시작하고 `advanceTime`으로만 진행합니다.
- **만료 판정: `expiresAt <= now`인 ACTIVE 예약은 모두 `EXPIRED`가 됩니다.** 따라서 시각이 만료 시각과 정확히 같아지는 순간에도 만료됩니다.
- 만료된 예약은 예약 양을 풀어 주지만, 실제 남은 양·소비량·폐기량은 바꾸지 않습니다. **만료된 예약은 기록에 남고(지워지지 않음)**, 그 뒤의 `cancel`·`consume`은 `RESERVATION_CLOSED`입니다.
- 여러 예약이 한 번에 만료돼도 `advanceTime` 이벤트는 하나입니다.
- 격리 중이거나 운송 중인 시료의 예약도 똑같이 만료되며, 만료가 격리·현재 용기·운송 목적지 확보를 바꾸지 않습니다([quality.md](quality.md), [transit.md](transit.md)).
