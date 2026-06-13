/* SVG 아이콘 모음 — 모든 아이콘은 currentColor 사용
   사용법: ICONS.water() 처럼 호출 → SVG 문자열 반환 */

const ICONS = {
  // 브랜드 마크 (물방울 + 매직 별)
  logo: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L7 9 a6 6 0 1 0 10 0 Z" fill="currentColor" opacity=".25"/><path d="M12 2 L7 9 a6 6 0 1 0 10 0 Z"/><path d="M16 14 l1 2 2 .5 -2 .5 -1 2 -1 -2 -2 -.5 2 -.5 z" fill="currentColor"/></svg>`,
  // 검색
  search: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  // 카트
  cart: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6"/></svg>`,
  // 사용자
  user: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>`,
  // 메뉴
  menu: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  // 전화
  phone: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>`,
  // 채팅 말풍선 (상담)
  chat: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  // 화살표
  arrow: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`,
  // 체크
  check: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,

  // ===== 카테고리 아이콘 =====
  // 24 그리드 / stroke 1.8 미니멀 라인 스타일 — 종합몰 카드 아이콘과 동일 규격
  // 정수기 — 물방울
  water: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3.5 C 9.8 8.2, 7 11.3, 7 14.5 a 5 5 0 0 0 10 0 C 17 11.3, 14.2 8.2, 12 3.5 Z"/>
  </svg>`,
  // 공기청정기 — 타워형 + 팬
  air: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6.5" y="3" width="11" height="18" rx="2.8"/>
    <circle cx="12" cy="9" r="2.6"/>
    <path d="M9.5 16.5h5"/>
  </svg>`,
  // 비데 — 시트 옆모습
  bidet: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16.5 10.5V7a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3.5"/>
    <path d="M5.5 13a2.5 2.5 0 0 1 2.5-2.5h8a2.5 2.5 0 0 1 2.5 2.5v.8a3.7 3.7 0 0 1-3.7 3.7H9.2a3.7 3.7 0 0 1-3.7-3.7z"/>
    <path d="M8.5 17.5v2M15.5 17.5v2"/>
  </svg>`,
  // 매트리스 — 베개 + 본체
  mattress: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5" y="5.5" width="5.5" height="3" rx="1.2"/>
    <rect x="2.8" y="10" width="18.4" height="8" rx="2.2"/>
    <path d="M2.8 14h18.4"/>
  </svg>`,
  // 프레임 — 침대
  bed: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 19v-7a2.5 2.5 0 0 1 2.5-2.5H12v5h9V19"/>
    <path d="M3 16.5h18"/>
    <circle cx="7.8" cy="12" r="1.7"/>
  </svg>`,
  // 필터
  filter: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="8.5" y="3" width="7" height="4" rx="1.2"/>
    <path d="M7 7h10l-1.4 11.3a2.5 2.5 0 0 1-2.5 2.2h-2.2a2.5 2.5 0 0 1-2.5-2.2L7 7Z"/>
  </svg>`,
  // 일시불 — 카드
  card: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2.8" y="5.5" width="18.4" height="13" rx="2.2"/>
    <path d="M2.8 10h18.4"/>
    <path d="M6.5 15h4"/>
  </svg>`,
  // 일반 박스 (fallback) — 큐브
  box: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 8.2 12 4.2l8 4v7.6l-8 4-8-4V8.2Z"/>
    <path d="M4 8.2l8 4 8-4M12 12.2v7.6"/>
  </svg>`,

  // ===== 히어로 작은 아이콘들 =====
  spark: () => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 13 9 20 10 13 11 12 18 11 11 4 10 11 9 Z"/></svg>`,
  shield: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  truck: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7h12v10H2zM14 11h4l3 3v3h-7"/><circle cx="6.5" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/></svg>`,
};

window.ICONS = ICONS;
