// real-time-collection-scraper-with-date-filter.js - 날짜 필터링 기능 추가

const puppeteer = require('puppeteer');
const fs = require('fs');

async function realTimeCollectionScraperWithDateFilter() {
    console.log('⚡ 날짜 필터링 Twitter 스크래퍼 시작\n');
    console.log('💡 전략: 특정 날짜 이후 트윗만 수집, 이전 날짜 발견시 중단\n');
    
    // ⭐ 날짜 필터 설정 (여기서 수정하세요!)
    const cutoffDate = '2025-06-20'; // YYYY-MM-DD 형식
    const cutoffDateTime = new Date(cutoffDate + 'T00:00:00.000Z');
    
    console.log(`📅 기준 날짜: ${cutoffDate} 이후 트윗만 수집`);
    console.log(`⏰ 기준 시각: ${cutoffDateTime.toISOString()}`);
    
    try {
        // Chrome에 연결
        console.log('🔗 Chrome 연결 중...');
        const browser = await puppeteer.connect({
            browserURL: 'http://localhost:9222',
            defaultViewport: null
        });
        
        console.log('✅ Chrome 연결 성공');
        
        // 기존 탭 활용
        const pages = await browser.pages();
        console.log(`📋 발견된 탭: ${pages.length}개`);
        
        let targetPage = null;
        for (let i = 0; i < pages.length; i++) {
            try {
                const url = await pages[i].url();
                if (url.includes('x.com') || url.includes('twitter.com')) {
                    targetPage = pages[i];
                    console.log(`✅ X.com 탭 발견! (탭 ${i + 1}): ${url.substring(0, 60)}...`);
                    break;
                }
            } catch (e) {
                console.log(`   탭 ${i + 1}: 접근 불가`);
            }
        }
        
        if (!targetPage) {
            console.log('❌ X.com 탭을 찾을 수 없습니다.');
            return;
        }
        
        await targetPage.bringToFront();
        
        console.log('\n📋 Chrome에서 X.com 검색 결과 페이지를 준비하고 아무 키나 누르세요...');
        await new Promise(resolve => {
            process.stdin.once('data', () => resolve());
        });
        
        // ⭐ 날짜 추출 함수
        const extractDateFromTweet = (tweet) => {
            try {
                // uniqueId에서 날짜 추출: "username_2025-06-18T01:17:55.000Z_content"
                const parts = tweet.uniqueId.split('_');
                for (let part of parts) {
                    if (part.includes('T') && part.includes('Z') && part.includes('-')) {
                        const dateStr = part;
                        const tweetDate = new Date(dateStr);
                        if (!isNaN(tweetDate.getTime())) {
                            return tweetDate;
                        }
                    }
                }
                
                // datetime 필드에서 추출
                if (tweet.datetime) {
                    const tweetDate = new Date(tweet.datetime);
                    if (!isNaN(tweetDate.getTime())) {
                        return tweetDate;
                    }
                }
                
                return null;
            } catch (error) {
                return null;
            }
        };
        
        // ⭐ 날짜 필터링 함수
        const isWithinDateRange = (tweet) => {
            const tweetDate = extractDateFromTweet(tweet);
            if (!tweetDate) {
                console.log(`   ⚠️ 날짜 추출 실패: ${tweet.username} - ${tweet.text.substring(0, 30)}...`);
                return true; // 날짜를 확인할 수 없으면 포함
            }
            
            const tweetDateStr = tweetDate.toISOString().split('T')[0];
            const isValid = tweetDateStr > cutoffDate; // cutoffDate보다 나중 날짜만 수집
            
            if (!isValid) {
                console.log(`   🛑 기준 날짜(${cutoffDate}) 도달: ${tweetDateStr} (${tweet.username})`);
                console.log(`   📝 내용: ${tweet.text.substring(0, 50)}...`);
            } else {
                console.log(`   ✅ 유효한 날짜: ${tweetDateStr} (${tweet.username})`);
            }
            
            return isValid;
        };
        
        // ⭐ 핵심: 실시간 트윗 수집 함수 (날짜 필터링 포함)
        const collectCurrentTweets = async () => {
            return await targetPage.evaluate(() => {
                const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
                const results = [];
                
                tweetElements.forEach((tweet, index) => {
                    try {
                        // 텍스트 추출
                        const textEl = tweet.querySelector('[data-testid="tweetText"]');
                        const text = textEl ? textEl.textContent.trim() : '';
                        
                        // 사용자명 추출
                        const userLink = tweet.querySelector('[data-testid="User-Name"] a');
                        let username = '';
                        let displayName = '';
                        
                        if (userLink) {
                            const href = userLink.getAttribute('href');
                            username = href ? href.replace('/', '') : '';
                            
                            const nameEl = userLink.querySelector('span[dir="ltr"]');
                            displayName = nameEl ? nameEl.textContent.trim() : '';
                        }
                        
                        // 시간 추출
                        const timeEl = tweet.querySelector('time[datetime]');
                        const datetime = timeEl ? timeEl.getAttribute('datetime') : '';
                        const timeText = timeEl ? timeEl.textContent.trim() : '';
                        
                        // 트윗 링크
                        const linkEl = timeEl ? timeEl.closest('a') : null;
                        const tweetLink = linkEl ? linkEl.getAttribute('href') : '';
                        
                        // 해시태그
                        const hashtagEls = tweet.querySelectorAll('[data-testid="tweetText"] a[href*="/hashtag/"]');
                        const hashtags = Array.from(hashtagEls).map(el => el.textContent.trim());
                        
                        // 상호작용 정보
                        const likeBtn = tweet.querySelector('[data-testid="like"]');
                        const retweetBtn = tweet.querySelector('[data-testid="retweet"]');
                        const replyBtn = tweet.querySelector('[data-testid="reply"]');
                        
                        const interactions = {
                            likes: likeBtn ? likeBtn.getAttribute('aria-label') || '0' : '0',
                            retweets: retweetBtn ? retweetBtn.getAttribute('aria-label') || '0' : '0',
                            replies: replyBtn ? replyBtn.getAttribute('aria-label') || '0' : '0'
                        };
                        
                        // 미디어 정보
                        const imageEls = tweet.querySelectorAll('[data-testid="tweetPhoto"] img');
                        const videoEls = tweet.querySelectorAll('video');
                        
                        // 더 강력한 고유 식별자 생성
                        const uniqueId = `${username}_${datetime || timeText}_${text.substring(0, 50).replace(/\s+/g, '_')}`;
                        
                        if (text && username) {
                            results.push({
                                uniqueId,
                                username,
                                displayName,
                                text,
                                datetime,
                                timeText,
                                link: tweetLink ? `https://x.com${tweetLink}` : '',
                                hashtags,
                                interactions,
                                hasImages: imageEls.length > 0,
                                imageCount: imageEls.length,
                                hasVideo: videoEls.length > 0,
                                domPosition: index + 1,
                                scrapedAt: new Date().toISOString()
                            });
                        }
                    } catch (err) {
                        // 오류 무시
                    }
                });
                
                return results;
            });
        };
        
        // 중복 제거 및 날짜 필터링 함수
        const addUniqueToCollection = (collection, newTweets, stepInfo) => {
            let addedCount = 0;
            let filteredCount = 0;
            let oldTweetFound = false;
            
            for (const tweet of newTweets) {
                // 날짜 필터링 먼저 확인
                if (!isWithinDateRange(tweet)) {
                    filteredCount++;
                    oldTweetFound = true;
                    break; // 기준 날짜 이전 트윗 발견시 즉시 중단
                }
                
                // 중복 검사
                const isDuplicate = collection.some(existing => 
                    existing.uniqueId === tweet.uniqueId ||
                    (existing.username === tweet.username && existing.text === tweet.text) ||
                    (existing.username === tweet.username && existing.datetime === tweet.datetime && existing.datetime !== '')
                );
                
                if (!isDuplicate) {
                    tweet.id = collection.length + 1;
                    tweet.collectionStep = stepInfo;
                    collection.push(tweet);
                    addedCount++;
                }
            }
            
            return { addedCount, filteredCount, oldTweetFound };
        };
        
        // 초기 수집
        console.log('🎯 초기 트윗 수집...');
        const allTweets = [];
        const initialTweets = await collectCurrentTweets();
        const initialResult = addUniqueToCollection(allTweets, initialTweets, 'initial_load');
        
        console.log(`📊 초기 수집: ${initialResult.addedCount}개 트윗 (필터링: ${initialResult.filteredCount}개)`);
        
        if (initialResult.oldTweetFound) {
            console.log(`🛑 초기 로드에서 기준 날짜(${cutoffDate}) 도달 - 수집 완료`);
        } else {
            console.log(`📈 수집 시작: ${cutoffDate} 이후 트윗 수집 중...`);
        }
        
        const maxSteps = 50;
        let consecutiveNoNew = 0;
        let stepCount = 0;
        let shouldStop = initialResult.oldTweetFound;
        
        if (!shouldStop) {
            console.log('\n⚡ 실시간 수집 시작...');
            
            while (stepCount < maxSteps && consecutiveNoNew < 5 && !shouldStop) {
                stepCount++;
                console.log(`\n📍 단계 ${stepCount}/${maxSteps} (현재: ${allTweets.length}개)`);
                
                // 스크롤 방법 순환
                let scrollMethod = '';
                let waitTime = 0;
                
                if (stepCount % 4 === 1) {
                    scrollMethod = '부드러운 스크롤';
                    waitTime = 2500;
                    await targetPage.evaluate(() => {
                        window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
                    });
                } else if (stepCount % 4 === 2) {
                    scrollMethod = '큰 스크롤 (2배)';
                    waitTime = 3500;
                    await targetPage.evaluate(() => {
                        window.scrollBy(0, window.innerHeight * 2);
                    });
                } else if (stepCount % 4 === 3) {
                    scrollMethod = '중간 스크롤';
                    waitTime = 3000;
                    await targetPage.evaluate(() => {
                        window.scrollBy(0, window.innerHeight * 1.5);
                    });
                } else {
                    scrollMethod = '강제 트리거';
                    waitTime = 2000;
                    await targetPage.evaluate(() => {
                        window.scrollBy(0, window.innerHeight * 0.8);
                        window.dispatchEvent(new Event('scroll'));
                        window.dispatchEvent(new Event('resize'));
                    });
                }
                
                console.log(`   🔄 ${scrollMethod} 실행...`);
                
                // 충분한 대기
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                // ⭐ 즉시 수집 및 날짜 필터링
                const currentTweets = await collectCurrentTweets();
                const stepInfo = `step_${stepCount}_${scrollMethod.replace(/\s+/g, '_')}`;
                const result = addUniqueToCollection(allTweets, currentTweets, stepInfo);
                
                console.log(`   📊 DOM에서 발견: ${currentTweets.length}개`);
                console.log(`   ➕ 새로 추가: ${result.addedCount}개`);
                console.log(`   🚫 날짜 필터링: ${result.filteredCount}개`);
                console.log(`   📈 총 수집: ${allTweets.length}개`);
                
                if (result.oldTweetFound) {
                    console.log(`   🛑 기준 날짜(${cutoffDate}) 도달 - 수집 중단!`);
                    shouldStop = true;
                    break;
                }
                
                if (result.addedCount === 0) {
                    consecutiveNoNew++;
                    console.log(`   ⚠️ 새 트윗 없음 (연속: ${consecutiveNoNew}/5)`);
                } else {
                    consecutiveNoNew = 0;
                    console.log(`   ✅ 새 트윗 발견!`);
                }
                
                // 짧은 대기 (다음 스크롤 준비)
                if (stepCount < maxSteps && consecutiveNoNew < 5 && !shouldStop) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        console.log(`\n✅ ${allTweets.length}개 트윗 수집 완료!`);
        
        if (allTweets.length > 0) {
            // 날짜 범위 확인
            const tweetDates = allTweets.map(tweet => {
                const date = extractDateFromTweet(tweet);
                return date ? date.toISOString().split('T')[0] : 'unknown';
            }).filter(date => date !== 'unknown');
            
            const uniqueDates = [...new Set(tweetDates)].sort().reverse();
            
            // 파일 저장
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `twitter_date_filtered_${cutoffDate}_${timestamp}.json`;
            
            // 상세 통계
            const stats = {
                dateFilter: {
                    cutoffDate: cutoffDate,
                    cutoffDateTime: cutoffDateTime.toISOString(),
                    reason: shouldStop ? 'old_tweet_found' : 'normal_completion'
                },
                totalTweets: allTweets.length,
                uniqueUsers: new Set(allTweets.map(t => t.username)).size,
                totalHashtags: allTweets.reduce((acc, t) => acc + t.hashtags.length, 0),
                tweetsWithImages: allTweets.filter(t => t.hasImages).length,
                tweetsWithVideo: allTweets.filter(t => t.hasVideo).length,
                stepsUsed: stepCount,
                dateRange: {
                    dates: uniqueDates,
                    oldest: uniqueDates[uniqueDates.length - 1],
                    newest: uniqueDates[0],
                    totalDays: uniqueDates.length
                },
                collectedAt: new Date().toISOString()
            };
            
            // 단계별 수집량 분석
            const stepStats = {};
            allTweets.forEach(tweet => {
                if (tweet.collectionStep) {
                    stepStats[tweet.collectionStep] = (stepStats[tweet.collectionStep] || 0) + 1;
                }
            });
            
            // 인기 해시태그
            const hashtagCount = {};
            allTweets.forEach(tweet => {
                tweet.hashtags.forEach(hashtag => {
                    hashtagCount[hashtag] = (hashtagCount[hashtag] || 0) + 1;
                });
            });
            
            const topHashtags = Object.entries(hashtagCount)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([hashtag, count]) => ({ hashtag, count }));
            
            const data = {
                metadata: {
                    scraper: 'real-time-collection-scraper-with-date-filter',
                    version: '8.1',
                    method: 'date_filtered_collection',
                    dateFilterEnabled: true,
                    success: true,
                    collectedAt: new Date().toISOString()
                },
                statistics: { ...stats, topHashtags, stepStats },
                tweets: allTweets
            };
            
            fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
            console.log(`💾 저장 완료: ${filename}`);
            
            // 성공 리포트
            console.log('\n⚡ 날짜 필터링 수집 성공 리포트 ⚡');
            console.log('====================================');
            console.log(`📅 필터 기준: ${cutoffDate} 이후`);
            console.log(`🔢 총 트윗: ${stats.totalTweets}개`);
            console.log(`👥 고유 사용자: ${stats.uniqueUsers}명`);
            console.log(`📆 수집 기간: ${stats.dateRange.newest} ~ ${stats.dateRange.oldest} (${stats.dateRange.totalDays}일)`);
            console.log(`🏷️ 총 해시태그: ${stats.totalHashtags}개`);
            console.log(`🖼️ 이미지 포함: ${stats.tweetsWithImages}개`);
            console.log(`🎥 비디오 포함: ${stats.tweetsWithVideo}개`);
            console.log(`🔄 사용된 단계: ${stats.stepsUsed}개`);
            console.log(`🛑 중단 이유: ${stats.dateFilter.reason === 'old_tweet_found' ? `기준 날짜(${cutoffDate}) 도달` : '정상 완료'}`);
            
            if (topHashtags.length > 0) {
                console.log('\n🏆 인기 해시태그 TOP 5:');
                topHashtags.slice(0, 5).forEach((item, index) => {
                    console.log(`   ${index + 1}. ${item.hashtag} (${item.count}회)`);
                });
            }
            
            console.log('\n📅 수집된 날짜 범위:');
            uniqueDates.slice(0, 10).forEach((date, index) => {
                const dateCount = tweetDates.filter(d => d === date).length;
                console.log(`   ${date}: ${dateCount}개 트윗`);
            });
            
            if (uniqueDates.length > 10) {
                console.log(`   ... 총 ${uniqueDates.length}일간의 데이터`);
            }
            
            console.log('\n🎉🎉🎉 날짜 필터링 수집 성공! 🎉🎉🎉');
            console.log(`   ${cutoffDate} 이후 트윗 ${stats.totalTweets}개 수집!`);
            console.log(`   기준 날짜 도달시 자동 중단!`);
            
        } else {
            console.log('\n⚠️ 수집된 트윗이 없습니다.');
            console.log(`   기준 날짜 ${cutoffDate} 이후 트윗이 없거나 이미 모든 트윗이 해당 날짜 이하입니다.`);
        }
        
        // 브라우저 연결 해제
        browser.disconnect();
        console.log('\n🔗 브라우저 연결 해제');
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

// 실행
realTimeCollectionScraperWithDateFilter().catch(console.error);