// cal.guidejung.com 정적 사이트 빌드: node build.mjs → dist/  (계산 검사도 함께 돌림)
// 페이지 내용은 calcs.mjs, 계산은 static/core.js, 화면 동작은 static/app.js.
import {mkdirSync, writeFileSync, rmSync, cpSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {calcs, CATS} from './calcs.mjs';
import {GUIDES} from './guides.mjs';

execFileSync(process.execPath, ['test.mjs'], {stdio: 'inherit'}); // 계산이 틀리면 여기서 멈춤

const SITE = {
  name: '척척계산',
  origin: 'https://cal.guidejung.com',
  desc: '연봉 실수령액, 퇴직금, 대출이자, 실업급여, 환율, 날짜, 퍼센트까지 자주 쓰는 계산기를 한곳에 모았습니다.',
  // 문의: 환경변수 CAL_EMAIL이 있으면 메일 주소, 없으면 같은 운영자의 life 문의 페이지로 연결
  contact: process.env.CAL_EMAIL ? `mailto:${process.env.CAL_EMAIL}` : 'https://life.guidejung.com/contact/',
  adsense: 'ca-pub-3087515825675332',  // guidejung.com·life와 같은 게시자 ID
  // 사용자가 받아 알려 주는 값(빈 값이면 태그를 넣지 않음)
  ga: '', clarity: '',
  verify: {google: '', naver: 'e0e1d43f9f6ad8dc17f762fef8d20b25da6a0791', bing: '94FB5F5FCBAB10DABDC0256A035F8369'},
  daumPin: '',
  updated: '2026-11-16',  // 요율 기준일: 요율을 고치면 함께 바꿈
};
const track = (SITE.ga ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.ga}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${SITE.ga}');</script>` : '')
  + (SITE.clarity ? `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${SITE.clarity}");</script>` : '')
  + Object.entries({'google-site-verification': SITE.verify.google, 'naver-site-verification': SITE.verify.naver, 'msvalidate.01': SITE.verify.bing})
    .filter(([, v]) => v).map(([k, v]) => `<meta name="${k}" content="${v}">`).join('');

const root = 'dist';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const url = p => SITE.origin + p;
const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const strip = h => h.replace(/<[^>]+>/g, '');
const dot = d => d.replaceAll('-', '.');

function page({title, desc, path, body, head = ''}) {
  const full = title === SITE.name ? `${SITE.name} - 자주 쓰는 계산기 한곳에` : `${title} | ${SITE.name}`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark">${track}
<title>${esc(full)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url(path)}">
<meta property="og:site_name" content="${esc(SITE.name)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:url" content="${url(path)}"><meta property="og:image" content="${url('/og.png')}?v=2"><meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css"><link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="${url('/rss.xml')}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsense}" crossorigin="anonymous"></script>${head}</head>
<body><a class="skip" href="#main">본문으로 바로가기</a><header><div class="wrap top"><a class="brand" href="/"><img src="/favicon.svg" alt="" width="28" height="28"><span><b>${esc(SITE.name.slice(0, 2))}</b>${esc(SITE.name.slice(2))}</span></a></div>
<nav class="gnb" aria-label="분류"><div class="wrap">${CATS.map(([s, n]) => `<a href="/#${s}">${n}</a>`).join('')}</div></nav></header>
<main id="main" class="wrap">${body}</main>
<footer><div class="wrap"><p><a href="/about/">사이트 소개</a> · <a href="/privacy/">개인정보 처리방침</a> · <a href="${SITE.contact}">문의</a> · <a href="/rss.xml">RSS</a></p>
<p>계산 결과는 참고용이며 법적 효력이 없습니다. 실제 금액은 해당 기관·회사에서 확인해 주세요.</p>
<p>© 2026 ${esc(SITE.name)} · <a href="https://guidejung.com/">guidejung.com</a></p></div></footer>
<script type="module" src="/app.js"></script></body></html>`;
}
function write(path, data) {
  const file = root + path + (path.endsWith('/') ? 'index.html' : '');
  mkdirSync(file.slice(0, file.lastIndexOf('/')), {recursive: true});
  writeFileSync(file, data);
}
const card = c => `<li><a href="/${c.slug}/"><span class="ic" aria-hidden="true">${c.icon}</span><b>${esc(c.name)}</b><span>${esc(c.desc.split(/\.(?=\s|$)/)[0])}</span></a></li>`;
const grid = list => `<ul class="cards">${list.map(card).join('')}</ul>`;

rmSync(root, {recursive: true, force: true});
const paths = [];

// 설명글(공식·기준표·가이드)은 guides.mjs 우선. 계산기마다 본문 글자수(공백 제외 아님, 태그 뺀 글자)를 확인해 1,500자 미만이면 알림.
for (const c of calcs) c.sections = GUIDES[c.slug] || c.sections;
const textLen = c => strip(c.lead + c.sections.flat().join('') + c.faq.flat().join('')).replace(/\s+/g, ' ').length;
const short = calcs.filter(c => textLen(c) < 1500);
console.log(calcs.map(c => `${c.slug} ${textLen(c).toLocaleString('ko-KR')}자`).join(' · '));
if (short.length) console.log(`⚠ 1,500자 미만: ${short.map(c => c.slug).join(', ')}`);

// ---------- 첫 화면: 분류별 계산기 목록 ----------
const mini = c => `<li><a href="/${c.slug}/"><span aria-hidden="true">${c.icon}</span><b>${esc(c.name)}</b><small>${esc(c.brief)}</small></a></li>`;
const home = `<section class="hello"><h1>${SITE.name}</h1><p>${SITE.desc}</p></section>
<div class="cats">${CATS.map(([s, n]) => {const list = calcs.filter(c => c.cat === s); return list.length ? `<section id="${s}" class="cat"><h2>${n}</h2><ul class="mini">${list.map(mini).join('')}</ul></section>` : '';}).join('')}</div>`;
write('/', page({title: SITE.name, desc: SITE.desc, path: '/', body: home,
  head: ld([{'@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: url('/'), inLanguage: 'ko'},
    {'@context': 'https://schema.org', '@type': 'ItemList', itemListElement: calcs.map((c, i) => ({'@type': 'ListItem', position: i + 1, name: c.name, url: url(`/${c.slug}/`)}))}])}));
paths.push('/');

// ---------- 계산기 페이지 ----------
for (const c of calcs) {
  const path = `/${c.slug}/`, catName = CATS.find(x => x[0] === c.cat)[1];
  const related = [...calcs.filter(x => x !== c && x.cat === c.cat), ...calcs.filter(x => x.cat !== c.cat)].slice(0, 8);
  const body = `<article class="post"><nav class="crumbs" aria-label="현재 위치"><a href="/">홈</a> › <a href="/#${c.cat}">${catName}</a></nav>
<h1>${esc(c.name)}</h1><p class="lead">${c.lead}</p>
${c.form}
${c.sections.map(([h, html]) => `<h2>${esc(h)}</h2>${html.replace(/<table/g, '<div class="tbl"><table').replace(/<\/table>/g, '</table></div>')}`).join('\n')}
<h2>자주 묻는 질문</h2>${c.faq.map(([q, a]) => `<details class="faq" open><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}
<p class="note">${dot(SITE.updated)} 기준 요율·제도로 계산합니다. 결과는 참고용이며, 신청이나 결정 전에 해당 기관에서 다시 확인해 주세요.</p></article>
<section class="related"><h2>다른 계산기</h2>${grid(related)}</section>`;
  write(path, page({title: c.title, desc: c.desc, path, body, head: ld([
    {'@context': 'https://schema.org', '@type': 'WebApplication', name: c.name, url: url(path), description: c.desc, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', inLanguage: 'ko', offers: {'@type': 'Offer', price: 0, priceCurrency: 'KRW'}},
    {'@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faq.map(([q, a]) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: strip(a)}}))},
    {'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['홈', '/'], [catName, `/#${c.cat}`], [c.name, path]].map(([n, p], i) => ({'@type': 'ListItem', position: i + 1, name: n, item: url(p)}))},
  ])}));
  paths.push(path);
}

// ---------- 고정 페이지 ----------
const statics = [
  ['/about/', '사이트 소개', `${SITE.name} 운영 원칙 안내입니다.`, `<article class="post"><h1>사이트 소개</h1>
<p>${SITE.name}(cal.guidejung.com)은 <a href="https://guidejung.com/">guidejung.com</a>과 같은 운영자가 만드는 무료 계산기 사이트입니다. 급여·퇴직금·실업급여, 대출·예적금, 날짜·나이, 생활 계산기 ${calcs.length}가지를 제공합니다.</p>
<h2>이렇게 만듭니다</h2><ul><li>최저임금·4대보험 요율·세율은 정부 발표와 법령으로 확인해 넣고, 페이지마다 기준일을 표시합니다.</li><li>국회 확정 전인 제도는 확정 전이라고 따로 표시합니다.</li><li>입력한 숫자와 글은 브라우저 안에서만 계산하며 서버로 보내지 않습니다.</li></ul>
<h2>광고</h2><p>이 사이트는 Google AdSense 광고를 싣습니다. 광고와 계산 결과는 구분해 보여 주며 광고 클릭을 권하지 않습니다.</p>
<h2>문의</h2><p>계산이 틀리거나 바뀐 요율을 알려 주시면 확인 후 고치겠습니다. <a href="${SITE.contact}">문의하기</a></p></article>`],
  ['/privacy/', '개인정보 처리방침', '방문자 정보 처리와 광고 쿠키 안내입니다.', `<article class="post"><h1>개인정보 처리방침</h1><p class="note">시행일 2026.11.16</p>
<h2>1. 수집하는 정보</h2><p>이 사이트는 회원가입과 입력 정보 저장이 없습니다. 계산기에 넣은 금액·날짜·글은 브라우저 안에서만 계산하고 서버로 보내지 않습니다. 환율 계산기는 환율 자료를 받기 위해 브라우저가 open.er-api.com에 접속합니다(입력값은 보내지 않음). 호스팅(GitHub Pages)은 보안과 운영을 위해 접속 IP 등 기록을 처리할 수 있습니다.</p>
<h2>2. 광고와 쿠키</h2><p>Google 등 제3자 광고 업체는 쿠키를 사용해 이 사이트와 다른 사이트 방문 기록을 바탕으로 광고를 보여 줄 수 있습니다. 맞춤 광고는 <a href="https://adssettings.google.com/" rel="noopener" target="_blank">Google 광고 설정</a>에서 끌 수 있습니다.</p>
${SITE.ga || SITE.clarity ? `<h2>3. 방문 통계</h2><p>방문 현황을 파악하기 위해 ${[SITE.ga && 'Google Analytics', SITE.clarity && 'Microsoft Clarity'].filter(Boolean).join('와 ')}를 사용합니다. 쿠키 등으로 방문 페이지, 이용 기기, 화면 이동 같은 정보를 이름 없이 수집합니다.</p>` : ''}<h2>${SITE.ga || SITE.clarity ? 4 : 3}. 문의</h2><p><a href="${SITE.contact}">문의하기</a></p></article>`],
];
for (const [path, title, desc, body] of statics) {write(path, page({title, desc, path, body})); paths.push(path);}
write('/404.html', page({title: '페이지를 찾을 수 없습니다', desc: SITE.desc, path: '/404.html',
  body: `<article class="post"><h1>페이지를 찾을 수 없습니다</h1><p>주소가 바뀌었거나 없는 페이지입니다. 아래 계산기를 이용해 주세요.</p></article>${grid(calcs)}`}));

// ---------- 사이트맵·robots·기타 ----------
write('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<url><loc>${url(p)}</loc><lastmod>${SITE.updated}</lastmod></url>`).join('')}</urlset>\n`);
write('/rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(SITE.name)}</title><link>${url('/')}</link><description>${esc(SITE.desc)}</description><language>ko</language><atom:link href="${url('/rss.xml')}" rel="self" type="application/rss+xml"/>${
  calcs.map(c => `<item><title>${esc(c.name)}</title><link>${url(`/${c.slug}/`)}</link><guid isPermaLink="true">${url(`/${c.slug}/`)}</guid><description>${esc(c.desc)}</description><category>${esc(CATS.find(x => x[0] === c.cat)[1])}</category><pubDate>${new Date(SITE.updated + 'T09:00:00+09:00').toUTCString()}</pubDate></item>`).join('')}</channel></rss>
`);
write('/robots.txt', `User-agent: *\nAllow: /\n\n# AI 검색·답변 엔진 허용\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${url('/sitemap.xml')}\n${SITE.daumPin ? SITE.daumPin + '\n' : ''}`);
write('/llms.txt', `# ${SITE.name}\n\n> ${SITE.desc} 요율 기준일 ${SITE.updated}.\n\n${calcs.map(c => `- [${c.name}](${url(`/${c.slug}/`)}): ${c.desc}`).join('\n')}\n`);
write('/ads.txt', `google.com, ${SITE.adsense.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
write('/CNAME', new URL(SITE.origin).host + '\n');
write('/.nojekyll', '');
cpSync('static', root, {recursive: true});
console.log(`계산기 ${calcs.length}개, 페이지 ${paths.length}개 → ${root}/`);
