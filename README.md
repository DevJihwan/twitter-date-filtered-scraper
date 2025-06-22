# Twitter 날짜 필터링 스크래퍼

특정 날짜 이후의 트윗만 수집하는 고급 Twitter 스크래퍼입니다.

## 🚀 주요 기능

### ✨ 날짜 필터링 (NEW!)
- **특정 날짜 이후 트윗만 수집**: 기준 날짜를 설정하여 그 이후의 트윗만 수집
- **자동 중단 기능**: 기준 날짜 이전의 트윗이 발견되면 자동으로 수집 중단
- **정확한 날짜 추출**: uniqueId와 datetime 필드에서 정확한 날짜 정보 추출

### 🔧 기존 기능
- **가상 스크롤 대응**: Twitter의 무한 스크롤에 최적화된 실시간 수집
- **즉시 수집**: 각 스크롤 단계마다 즉시 데이터 수집하여 손실 방지
- **중복 제거**: 강력한 중복 검사로 데이터 품질 보장
- **상세 통계**: 수집 과정과 결과에 대한 자세한 분석 제공

## 📁 파일 구성

- `date-filtered-scraper.js` - **메인 스크래퍼** (날짜 필터링 기능 포함)
- `original-scraper.js` - 원본 스크래퍼 (참고용)
- `package.json` - 의존성 관리
- `README.md` - 사용 가이드

## 🛠️ 설치 및 설정

### 1. 의존성 설치
```bash
npm install puppeteer
```

### 2. Chrome 원격 디버깅 모드 실행
```bash
# Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\\temp\\chrome_debug"

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome_debug"

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome_debug"
```

### 3. Twitter 검색 준비
1. Chrome에서 X.com (구 Twitter) 접속
2. 원하는 해시태그나 키워드로 검색
3. 검색 결과 페이지를 "최신순"으로 정렬

## 📅 날짜 필터링 설정

### 기준 날짜 변경
`date-filtered-scraper.js` 파일에서 다음 라인을 수정하세요:

```javascript
// ⭐ 날짜 필터 설정 (여기서 수정하세요!)
const cutoffDate = '2025-06-21'; // YYYY-MM-DD 형식
```

### 예시 설정
```javascript
// 오늘부터 수집
const cutoffDate = '2025-06-22';

// 일주일 전부터 수집
const cutoffDate = '2025-06-15';

// 특정 날짜부터 수집
const cutoffDate = '2025-06-20';
```

## 🚀 실행 방법

```bash
node date-filtered-scraper.js
```

### 실행 단계
1. 스크래퍼 실행
2. Chrome 연결 확인
3. X.com 탭 자동 감지
4. **Enter 키를 눌러 수집 시작**
5. 자동으로 스크롤하며 트윗 수집
6. 기준 날짜 이전 트윗 발견시 자동 중단
7. JSON 파일로 결과 저장

## 📊 수집 데이터 형식

### 메타데이터
```json
{
  "metadata": {
    "scraper": "real-time-collection-scraper-with-date-filter",
    "version": "8.0",
    "method": "date_filtered_collection",
    "dateFilterEnabled": true,
    "success": true,
    "collectedAt": "2025-06-22T13:51:26Z"
  }
}
```

### 통계 정보
```json
{
  "statistics": {
    "dateFilter": {
      "cutoffDate": "2025-06-21",
      "cutoffDateTime": "2025-06-21T00:00:00.000Z",
      "reason": "old_tweet_found"
    },
    "totalTweets": 85,
    "uniqueUsers": 23,
    "dateRange": {
      "newest": "2025-06-22",
      "oldest": "2025-06-21",
      "totalDays": 2
    }
  }
}
```

### 트윗 데이터
```json
{
  "uniqueId": "username_2025-06-22T10:30:15.000Z_트윗내용",
  "username": "example_user",
  "displayName": "사용자 이름",
  "text": "트윗 전체 내용",
  "datetime": "2025-06-22T10:30:15.000Z",
  "link": "https://x.com/example_user/status/1234567890",
  "hashtags": ["#해시태그1", "#해시태그2"],
  "interactions": {
    "likes": "5 마음에 들어요",
    "retweets": "2 재게시",
    "replies": "1 답글"
  },
  "hasImages": true,
  "imageCount": 2,
  "hasVideo": false
}
```

## 💡 활용 예시

### 1. 실시간 모니터링
```bash
# 오늘 날짜로 설정하여 실시간 트윗만 수집
const cutoffDate = '2025-06-22';
```

### 2. 특정 기간 분석
```bash
# 특정 이벤트 이후의 반응 분석
const cutoffDate = '2025-06-20';
```

### 3. 최근 트렌드 파악
```bash
# 일주일 전부터의 트렌드 분석
const cutoffDate = '2025-06-15';
```

## 🔧 고급 설정

### 수집 제한 조정
```javascript
const maxSteps = 50;     // 최대 스크롤 횟수
const maxTweets = 100;   // 최대 수집 트윗 수
```

### 스크롤 간격 조정
```javascript
// 각 스크롤 방법별 대기 시간 (밀리초)
waitTime = 2500;  // 부드러운 스크롤
waitTime = 3500;  // 큰 스크롤
waitTime = 3000;  // 중간 스크롤
waitTime = 2000;  // 강제 트리거
```

## 📈 성능 최적화

### 메모리 효율성
- 실시간 중복 제거로 메모리 사용량 최적화
- 단계별 즉시 수집으로 대용량 데이터 처리

### 안정성
- 네트워크 오류 대응
- DOM 변화 감지 및 적응
- 자동 재시도 메커니즘

### 속도
- 병렬 데이터 추출
- 효율적인 셀렉터 사용
- 최적화된 스크롤 패턴

## 🚨 주의사항

1. **Twitter 이용약관 준수**: 과도한 요청으로 계정이 제한될 수 있음
2. **데이터 사용 목적**: 개인 연구 및 분석 목적으로만 사용
3. **실행 환경**: 안정적인 네트워크 연결 필요
4. **Chrome 버전**: 최신 버전 사용 권장

## 🔍 문제 해결

### Chrome 연결 실패
```bash
# Chrome이 디버깅 모드로 실행되었는지 확인
# 포트 9222가 사용 중인지 확인
netstat -an | grep 9222
```

### 트윗 수집 실패
- 네트워크 연결 상태 확인
- Twitter 페이지 로딩 완료 후 실행
- 검색 결과가 "최신순"으로 정렬되었는지 확인

### 날짜 필터링 오류
- uniqueId에 올바른 날짜 형식이 포함되었는지 확인
- 기준 날짜 형식이 'YYYY-MM-DD'인지 확인

## 📞 지원

문제가 발생하거나 개선 제안이 있으시면 GitHub Issues를 통해 문의해주세요.

---

**개발자**: DevJihwan  
**라이센스**: MIT  
**버전**: 8.0 (날짜 필터링 기능 추가)  