# cal.guidejung.com (계산기 모음) 운영 안내

자주 쓰는 계산기를 모은 정적 사이트입니다. life.guidejung.com(`D:\guidejung\life-site`)과 같은 방식(빌드 스크립트 하나 → GitHub Pages)으로 운영합니다.

## 구조
- `calcs.mjs`: 계산기 페이지 내용(제목·설명·입력칸·FAQ). 한 항목 = `/slug/` 한 페이지. 분류는 `CATS`.
- `guides.mjs`: 계산기 아래 설명글(계산 공식 → 기준표 → 상황별 가이드). 있으면 calcs.mjs의 `sections` 대신 씀. 예시 표 숫자는 core.js로 계산해 넣어 계산기와 항상 같음. 빌드가 페이지별 글자수를 출력하고 1,500자 미만이면 경고.
- `static/core.js`: 계산 로직과 연도별 요율 `RATES`(최저임금·국민연금·건강·장기요양·고용·실업급여 상한). 화면 코드 없음.
- `static/app.js`: 화면 동작. `<form data-calc="이름">` 입력이 바뀌면 `R[이름]`이 결과를 그림.
- `test.mjs`: 계산 검사. `build.mjs`가 먼저 실행하므로 검사가 틀리면 빌드가 멈춤.
- 빌드: `node build.mjs` → `dist/` (첫 화면·계산기·소개·개인정보·404·sitemap·robots·llms.txt·ads.txt·CNAME). 미리보기: launch.json `cal`(포트 8797).
- 배포: `main`에 push하면 `.github/workflows/pages.yml`이 GitHub Pages로 배포. 도메인은 Cloudflare DNS `cal` CNAME → kenshin240919-web.github.io(프록시 끔).

## 계산기 추가
1. `core.js`에 계산 함수, `test.mjs`에 검사 1~2줄
2. `app.js`의 `R`에 같은 이름 렌더 함수(숫자 입력 이름은 `NUMS`에 추가)
3. `calcs.mjs`에 페이지 항목 → `node build.mjs`

## 지킬 것
- 요율·금액은 정부 발표·법령으로 확인한 것만 넣고, 바꾸면 `build.mjs`의 `SITE.updated`(기준일)도 바꿈. 매년 1월 1일 전후로 최저임금·4대보험 요율, 7월 국민연금 상·하한 확인.
- 국회 확정 전 제도(예: 2027 실업급여 상한 개편안)는 확정 전이라고 화면에 표시.
- 입력값은 브라우저 안에서만 계산(서버 전송·저장 없음). 환율만 open.er-api.com에서 받음(출처 표시 필수).
- 숫자는 천 단위 콤마, 줄바꿈은 `word-break:keep-all`.
- GA·Clarity·네이버 인증값은 `build.mjs`의 `SITE`에 사용자가 받은 값을 넣음. 문의 메일은 환경변수 `CAL_EMAIL`(없으면 life 문의 페이지로 연결).
- 2차 후보: 부동산 세금(product.guidejung.com의 종부세·양도세·취득세·상속세·증여세 이식), 연차, 임신 주수·출산 예정일, BMI, 학점, 전기요금.
