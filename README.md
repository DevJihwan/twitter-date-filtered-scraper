# Twitter 날짜 필터링 스크래퍼

특정 날짜 이후의 트윗만 수집하고, 기준 날짜에 도달하면 자동으로 중단하는 고급 Twitter 스크래퍼입니다.

## 🚀 주요 기능

### ✨ 날짜 필터링 (NEW!)
- **특정 날짜 이후 트윗만 수집**: 기준 날짜를 설정하여 그 이후의 트윗만 수집
- **자동 중단 기능**: 기준 날짜에 도달하면 자동으로 수집 중단 (트윗 수 제한 없음)
- **정확한 날짜 추출**: uniqueId와 datetime 필드에서 정확한 날짜 정보 추출
- **무제한 수집**: 날짜 조건만 만족하면 트윗 개수 제한 없이 수집

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

### ⭐ 기준 날짜 변경 (중요!)
`date-filtered-scraper.js` 파일에서 다음 라인을 수정하세요:

```javascript
// ⭐ 날짜 필터 설정 (여기서 수정하세요!)
const cutoffDate = '2025-06-20'; // YYYY-MM-DD 형식
```

### 동작 원리
- **2025-06-20**을 기준으로 설정하면
- **2025-06-21, 2025-06-22** 등의 트윗은 수집
- **2025-06-20 또는 그 이전** 트윗이 발견되면 즉시 수집 중단

### 예시 설정
```javascript
// 어제부터 수집 (오늘은 2025-06-22)
const cutoffDate = '2025-06-21';

// 일주일 전부터 수집  
const cutoffDate = '2025-06-15';

// 특정 이벤트 이후부터 수집
const cutoffDate = '2025-06-18';
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
6. 기준 날짜에 도달하면 자동 중단
7. JSON 파일로 결과 저장

## 📊 수집 데이터 형식

### 메타데이터
```json
{
  "metadata": {
    "scraper": "real-time-collection-scraper-with-date-filter",
    "version": "8.1",
    "method": "date_filtered_collection",
    "dateFilterEnabled": true,
    "success": true,
    "collectedAt": "2025-06-22T14:00:00Z"
  }
}
```

### 통계 정보
```json
{
  "statistics": {
    "dateFilter": {
      "cutoffDate": "2025-06-20",
      "cutoffDateTime": "2025-06-20T00:00:00.000Z",
      "reason": "old_tweet_found"
    },
    "totalTweets": 156,
    "uniqueUsers": 34,
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
```javascript
// 어제부터 오늘까지의 실시간 트윗 수집
const cutoffDate = '2025-06-21';
```

### 2. 이벤트 후 반응 분석
```javascript
// 특정 이벤트 발생 후의 모든 반응 수집
const cutoffDate = '2025-06-19'; // 이벤트 발생일
```

### 3. 주간/월간 트렌드 분석
```javascript
// 지난 일주일간의 모든 관련 트윗 수집
const cutoffDate = '2025-06-15';
```

## 🔧 고급 설정

### 스크롤 제한 조정
```javascript
const maxSteps = 50;     // 최대 스크롤 횟수 (날짜 조건이 우선)
```

### 연속 실패 허용 횟수
```javascript
consecutiveNoNew < 5     // 5번 연속 새 트윗이 없으면 중단
```

### 스크롤 간격 조정
```javascript
// 각 스크롤 방법별 대기 시간 (밀리초)
waitTime = 2500;  // 부드러운 스크롤
waitTime = 3500;  // 큰 스크롤
waitTime = 3000;  // 중간 스크롤
waitTime = 2000;  // 강제 트리거
```

## 📈 성능 및 특징

### 🔄 무제한 수집
- 트윗 개수 제한 없음
- 오직 날짜 조건으로만 중단
- 수천 개의 트윗도 안정적으로 처리

### ⚡ 효율적인 중단
- 기준 날짜 도달 시 즉시 중단
- 불필요한 스크롤 방지
- 네트워크 리소스 절약

### 🎯 정확한 필터링
- 실시간 날짜 검증
- 다중 날짜 소스 활용
- 오차 없는 중단 시점 감지

## 🚨 주의사항

1. **날짜 형식**: 반드시 'YYYY-MM-DD' 형식으로 설정
2. **검색 결과 정렬**: Twitter에서 "최신순" 정렬 필수
3. **네트워크 안정성**: 대용량 수집 시 안정적인 연결 필요
4. **Twitter 정책**: 과도한 요청으로 인한 제한 주의

## 🔍 문제 해결

### 날짜 필터링이 작동하지 않는 경우
```bash
# 1. 트윗의 날짜 정보 확인
# 2. cutoffDate 형식이 올바른지 확인 (YYYY-MM-DD)
# 3. 검색 결과가 최신순으로 정렬되었는지 확인
```

### 수집이 너무 일찍 중단되는 경우
```bash
# 1. cutoffDate가 너무 최근 날짜로 설정되었는지 확인
# 2. 해당 날짜 이후에 실제로 트윗이 있는지 확인
# 3. 날짜 추출이 정상적으로 되는지 로그 확인
```

### Chrome 연결 실패
```bash
# Chrome이 디버깅 모드로 실행되었는지 확인
netstat -an | grep 9222
```

## 📞 지원

문제가 발생하거나 개선 제안이 있으시면 GitHub Issues를 통해 문의해주세요.

---

**개발자**: DevJihwan  
**라이센스**: MIT  
**버전**: 8.1 (무제한 수집 + 자동 중단 기능)  
**기준 날짜**: 2025-06-20 (수정 가능)