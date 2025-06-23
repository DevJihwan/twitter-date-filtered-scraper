// twitter-completeness-validator.js - Twitter 수집 완전성 검증 도구

const fs = require('fs');
const path = require('path');

async function validateTwitterCompleteness() {
    console.log('🔍 Twitter 수집 완전성 검증 도구 시작\n');
    
    try {
        // JSON 파일 찾기
        const currentDir = process.cwd();
        const files = fs.readdirSync(currentDir);
        
        const twitterJsonFiles = files.filter(file => 
            file.includes('twitter') && 
            file.endsWith('.json') && 
            (file.includes('date_filtered') || file.includes('realtime_collection'))
        );
        
        if (twitterJsonFiles.length === 0) {
            console.log('❌ Twitter JSON 파일을 찾을 수 없습니다.');
            return;
        }
        
        // 가장 최근 파일 선택
        const latestFile = twitterJsonFiles.sort().reverse()[0];
        console.log(`📁 검증할 파일: ${latestFile}\n`);
        
        // JSON 파일 읽기
        const jsonData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
        
        if (!jsonData.tweets || !jsonData.statistics) {
            console.log('❌ 올바른 데이터 구조가 아닙니다.');
            return;
        }
        
        const tweets = jsonData.tweets;
        const stats = jsonData.statistics;
        
        console.log('📊 기본 정보');
        console.log('=============');
        console.log(`수집된 트윗 수: ${tweets.length}개`);
        console.log(`수집 방법: ${jsonData.metadata.method}`);
        console.log(`중단 이유: ${stats.dateFilter.reason}`);
        console.log(`사용된 스크롤 단계: ${stats.stepsUsed}개`);
        
        // 1. 🕐 시간 연속성 검증
        console.log('\n🕐 1. 시간 연속성 검증');
        console.log('========================');
        
        const validTweets = tweets.filter(tweet => tweet.datetime && tweet.datetime !== '');
        if (validTweets.length === 0) {
            console.log('❌ 유효한 날짜가 있는 트윗이 없습니다.');
            return;
        }
        
        // 시간순 정렬 (최신순)
        const sortedTweets = validTweets.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
        
        console.log(`✅ 유효한 트윗: ${sortedTweets.length}개`);
        console.log(`📅 시간 범위: ${sortedTweets[sortedTweets.length-1].datetime} ~ ${sortedTweets[0].datetime}`);
        
        // 시간 간격 분석
        const timeGaps = [];
        for (let i = 0; i < sortedTweets.length - 1; i++) {
            const current = new Date(sortedTweets[i].datetime);
            const next = new Date(sortedTweets[i + 1].datetime);
            const gapMinutes = (current - next) / (1000 * 60); // 분 단위
            timeGaps.push(gapMinutes);
        }
        
        const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
        const maxGap = Math.max(...timeGaps);
        const largeGaps = timeGaps.filter(gap => gap > 60); // 1시간 이상 간격
        
        console.log(`⏱️ 평균 트윗 간격: ${avgGap.toFixed(1)}분`);
        console.log(`⏱️ 최대 트윗 간격: ${maxGap.toFixed(1)}분`);
        console.log(`⚠️ 1시간 이상 간격: ${largeGaps.length}회`);
        
        if (largeGaps.length > 0) {
            console.log('\n📍 큰 시간 간격 발견 지점들:');
            timeGaps.forEach((gap, index) => {
                if (gap > 60) {
                    const beforeTweet = sortedTweets[index];
                    const afterTweet = sortedTweets[index + 1];
                    console.log(`   ${afterTweet.datetime} → ${beforeTweet.datetime} (${gap.toFixed(1)}분 간격)`);
                }
            });
        }
        
        // 2. 📈 수집 효율성 분석
        console.log('\n📈 2. 수집 효율성 분석');
        console.log('======================');
        
        const stepStats = stats.stepStats || {};
        const effectiveSteps = Object.entries(stepStats).filter(([step, count]) => count > 0);
        const totalCollected = effectiveSteps.reduce((sum, [step, count]) => sum + count, 0);
        
        console.log(`🎯 효과적인 단계: ${effectiveSteps.length}개`);
        console.log(`📊 단계별 평균 수집: ${(totalCollected / effectiveSteps.length).toFixed(1)}개/단계`);
        
        // 비효율적인 단계들 (수집량이 0인 단계)
        const allStepCount = stats.stepsUsed;
        const zeroSteps = allStepCount - effectiveSteps.length;
        if (zeroSteps > 0) {
            console.log(`⚠️ 비효율적 단계: ${zeroSteps}개 (수집량 0)`);
            console.log(`💡 효율성: ${((effectiveSteps.length / allStepCount) * 100).toFixed(1)}%`);
        }
        
        // 3. 🎯 완전성 지표 계산
        console.log('\n🎯 3. 완전성 지표');
        console.log('==================');
        
        let completenessScore = 100;
        let issues = [];
        
        // 중단 이유 확인
        if (stats.dateFilter.reason === 'old_tweet_found') {
            console.log('✅ 정상 중단: 기준 날짜 도달로 중단');
        } else {
            console.log('⚠️ 기타 중단: 다른 이유로 중단됨');
            completenessScore -= 10;
            issues.push('기준 날짜 도달 전 중단');
        }
        
        // 연속 실패 확인
        const consecutiveNoNew = 5; // 기본값 (실제 코드에서 확인 필요)
        if (zeroSteps > 10) {
            console.log('⚠️ 과도한 비효율적 단계');
            completenessScore -= 15;
            issues.push('수집 효율성 저하');
        }
        
        // 시간 간격 확인
        if (largeGaps.length > 3) {
            console.log('⚠️ 과도한 시간 간격');
            completenessScore -= 10;
            issues.push('시간 연속성 문제');
        }
        
        // 수집률 확인
        const collectionRate = (sortedTweets.length / stats.stepsUsed);
        if (collectionRate < 0.5) {
            console.log('⚠️ 낮은 수집률');
            completenessScore -= 20;
            issues.push('낮은 수집 효율');
        }
        
        console.log(`\n🏆 완전성 점수: ${completenessScore}/100`);
        
        if (completenessScore >= 90) {
            console.log('🟢 상태: 매우 양호 - 수집이 거의 완전한 것으로 보입니다');
        } else if (completenessScore >= 70) {
            console.log('🟡 상태: 양호 - 일부 누락 가능성이 있습니다');
        } else if (completenessScore >= 50) {
            console.log('🟠 상태: 보통 - 상당한 누락이 있을 수 있습니다');
        } else {
            console.log('🔴 상태: 불량 - 심각한 누락이 예상됩니다');
        }
        
        if (issues.length > 0) {
            console.log('\n⚠️ 발견된 문제들:');
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }
        
        // 4. 📝 수동 검증 가이드
        console.log('\n📝 4. 수동 검증 가이드');
        console.log('======================');
        
        console.log('다음 방법으로 수동 검증을 권장합니다:');
        console.log('\n🔍 트위터에서 직접 확인:');
        console.log(`   1. X.com에서 "${stats.topHashtags[0]?.hashtag || '해시태그'}" 검색`);
        console.log('   2. "최신" 탭으로 정렬');
        console.log('   3. 다음 시간대의 트윗들이 있는지 확인:');
        
        // 샘플 시간대 제시
        const sampleTimes = [
            sortedTweets[0]?.datetime,
            sortedTweets[Math.floor(sortedTweets.length/2)]?.datetime,
            sortedTweets[sortedTweets.length-1]?.datetime
        ].filter(Boolean);
        
        sampleTimes.forEach((time, index) => {
            const koreanTime = new Date(time).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            console.log(`      - ${koreanTime} 근처`);
        });
        
        console.log('\n🔄 재수집 권장 상황:');
        console.log('   - 완전성 점수가 70점 미만');
        console.log('   - 1시간 이상 간격이 5회 이상');
        console.log('   - 수동 확인에서 누락 발견');
        
        // 5. 📋 상세 통계
        console.log('\n📋 5. 상세 통계');
        console.log('================');
        
        // 시간대별 분포
        const hourlyDistribution = {};
        sortedTweets.forEach(tweet => {
            const hour = new Date(tweet.datetime).getHours();
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
        });
        
        console.log('⏰ 시간대별 트윗 분포:');
        Object.entries(hourlyDistribution)
            .sort(([a], [b]) => a - b)
            .forEach(([hour, count]) => {
                const bar = '█'.repeat(Math.ceil(count / Math.max(...Object.values(hourlyDistribution)) * 20));
                console.log(`   ${hour.padStart(2, '0')}시: ${count.toString().padStart(3)}개 ${bar}`);
            });
        
        // 날짜별 분포
        const dailyDistribution = {};
        sortedTweets.forEach(tweet => {
            const date = tweet.datetime.split('T')[0];
            dailyDistribution[date] = (dailyDistribution[date] || 0) + 1;
        });
        
        console.log('\n📅 날짜별 트윗 분포:');
        Object.entries(dailyDistribution)
            .sort(([a], [b]) => b.localeCompare(a))
            .forEach(([date, count]) => {
                console.log(`   ${date}: ${count}개`);
            });
        
        // 6. 🚀 개선 제안
        console.log('\n🚀 6. 수집 개선 제안');
        console.log('====================');
        
        if (completenessScore < 90) {
            console.log('다음 방법으로 수집 완전성을 개선할 수 있습니다:');
            
            if (issues.includes('수집 효율성 저하')) {
                console.log('   💡 대기 시간 증가 (waitTime 값 늘리기)');
                console.log('   💡 스크롤 방법 다양화');
            }
            
            if (issues.includes('시간 연속성 문제')) {
                console.log('   💡 더 느린 스크롤 속도');
                console.log('   💡 네트워크 상태 확인');
            }
            
            if (issues.includes('기준 날짜 도달 전 중단')) {
                console.log('   💡 maxSteps 값 증가');
                console.log('   💡 consecutiveNoNew 임계값 증가');
            }
        } else {
            console.log('✨ 수집이 매우 잘 되었습니다! 추가 개선이 필요하지 않습니다.');
        }
        
        console.log('\n🎉 검증 완료!');
        console.log(`완전성 점수: ${completenessScore}/100`);
        
    } catch (error) {
        console.error('❌ 검증 중 오류 발생:', error.message);
    }
}

// 실행
validateTwitterCompleteness().catch(console.error);