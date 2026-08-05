# Smart Scheduler Frontend

Vue 3 기반의 스마트 일정 관리 프론트엔드 프로젝트입니다. 로그인부터 캘린더 관리, 자연어 기반 일정 추가, AI 인사이트 확인까지 한 번에 사용할 수 있도록 구성되어 있습니다.

## 주요 기능
- 로그인 화면 및 라우팅 연동
- 월간 캘린더 화면에서 일정 조회 및 관리
- 자연어 입력을 통한 일정 추가/삭제
- 일정 충돌 감지 및 추천 시간 제안
- AI 기반 주간 요약 및 일정 패턴 분석
- 다크 모드 토글
- 일정 삭제 및 전체 삭제 기능
- 브라우저 알림 권한 요청 및 일정 알림 체크

## 기술 스택
- Vue 3
- Vue Router
- Vue CLI
- Vue Cal
- Axios
- Moment.js
- FullCalendar 관련 패키지

## 프로젝트 구조
- src/components/Login.vue: 로그인 화면
- src/view/Calendar.vue: 캘린더 및 일정 관리 화면
- src/router/index.js: 라우팅 설정
- src/App.vue: 앱 진입점

## 실행 방법
### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
프로젝트가 백엔드 API와 연동되므로, 루트 디렉터리에 아래와 같은 환경 변수를 설정합니다.

```bash
VUE_APP_API_URL=http://localhost:8000
```

### 3. 개발 서버 실행
```bash
npm run serve
```

브라우저에서 다음 주소로 접속할 수 있습니다.
- http://localhost:8080

## 빌드
```bash
npm run build
```

## Lint
```bash
npm run lint
```

## 참고 사항
이 프론트엔드는 백엔드 API와 함께 동작하도록 설계되어 있습니다. 특히 아래 엔드포인트가 필요합니다.
- /login
- /parse_schedule
- /delete_schedule

백엔드 서버가 실행 중이어야 자연어 일정 처리와 로그인 기능이 정상적으로 동작합니다.
