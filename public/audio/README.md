# Audio assets (`public/audio`)

사운드 지휘소: [`src/data/audioManifest.ts`](../../src/data/audioManifest.ts)  
스트림 API: `GET /api/sound-stream?eventId=…`

## 로컬 파일 (전투 · 공습)

`localSrc`가 있으면 Freesound를 **완전히 우회**합니다. (텍스트 검색 오매칭·개 짖는 소리 등 방지)

### 공습
| 파일 | 이벤트 | 용도 |
|------|--------|------|
| `air-attack-siren.mp3` | `tzeva-red-alert` · `tzeva-all-clear` · `neptun-air-alert` | 이스라엘 / 우크라 공습 사이렌 (칩·버튼 fly 전용) |

### 전장
| 파일 | 이벤트 | 용도 |
|------|--------|------|
| `combat-explosion.wav` | `neptun-impact` · `firms-combat-burst` | 탄착 / FIRMS 폭격 추정 |
| `combat-bombing.wav` | `frontline-bombing` | 전선 간헐 폭격 |
| `combat-artillery.wav` | `frontline-artillery-shot` | 전선 포격 |
| `combat-gunfire.wav` | `frontline-gunfire` · `gdelt-war-sting` | 총격 |
| `combat-mlrs.wav` | `frontline-mlrs` | 다련장 |
| `combat-frontline-bed.wav` | `frontline-artillery-ambient` | 전선 rumble 루프 |

---

## 큐레이션 Freesound ID

`freesoundId` 고정 · ID 실패 시에만 `freesoundQuery` 검색 폴백.  
필요: `.env.local`의 `FREESOUND_API_KEY`.

### 지정학 부가 · 긴장 · 앰비언트
| Event ID | FS ID | 설명 |
|----------|-------|------|
| `dispute-tension-high` | 593785 | 전쟁/고긴장 구역 rumble (루프) |
| `carrier-deck-ambient` | 162449 | 항모 갑판 앰비언스 (루프) |
| `neptun-uav-flyby` | 854382 | UAV 프로펠러 |
| `neptun-ballistic` | 211617 | 먼 로켓 whoosh |
| `gdelt-protest-sting` | 360758 | 먼 시위 군중 |
| `hero-breaking` | 419493 | 뉴스 스팅 차임 |
| `cyber-incident` | 423166 | 디지털 UI 에러 톤 |
| `telegram-live-burst` | 524205 | 무전 스퀠치 |
| `firms-wildfire-crackle` | 620324 | 잔불/캠프파이어 |
| `firms-exercise` | 478189 | 훈련 구역 극소 신호 |

### 경제
| Event ID | FS ID | 설명 |
|----------|-------|------|
| `port-ambient` | 254130 | 항구 앰비언스 (루프) |
| `construction-ambient` | 366124 | 건설 현장 (루프) |
| `pipeline-hum` | 453514 | 파이프/펌프 허밍 (루프) |
| `datacenter-hum` | 610761 | 서버룸 팬 (루프) |
| `ticker-spike` | 380490 | NYSE 벨 |
| `vix-spike` | 478189 | 짧은 경고 비프 |
| `oil-spike` | 234782 | 스팀/압력 히스 |
| `econ-hub-arrive` | 86739 | 항만 크레인 |
| `sanctions-stamp` | 470710 | 도장 |
| `economy-alert` | 571511 | 소프트 LowDing |

### UI (매니페스트 예약 · 자동 UI 클릭음은 비활성)
| Event ID | FS ID |
|----------|-------|
| `flyto-arrive` | 833599 |
| `mode-switch` / `ui-click` | 458586 |
| `boot-ready` | 413749 |
| `panel-open` | 419493 |
| `load-error` | 423169 |
| `stream-disconnect` | 524205 |

---

## 재생 우선순위 (앰비언트)

**지정학:** 전선 교전음 → 긴장 rumble → 항모 갑판  

**지경학:** 파이프라인 → 데이터센터 → 항구 → 경제중심  

체크박스만 켠다고 소리가 나지 않습니다. 카메라가 해당 지역·이벤트에 들어오거나, 공습은 **버튼 fly** 때만 재생됩니다. 상세는 루트 [`README.md`](../../README.md) 「사운드 시스템」.
