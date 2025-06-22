// real-time-collection-scraper.js - 가상 스크롤 대응 실시간 수집 스크래퍼

const puppeteer = require('puppeteer');
const fs = require('fs');

async function realTimeCollectionScraper() {
    console.log('⚡ 실시간 수집 Twitter 스크래퍼 시작\n');
    console.log('💡 전략: 가상 스크롤 대응 - 각 단계마다 즉시 수집 및 저장\n');
    
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
        
        // ⭐ 핵심: 실시간 트윗 수집 함수
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
        
        // 중복 제거 함수
        const addUniqueToCollection = (collection, newTweets, stepInfo) => {
            let addedCount = 0;
            
            for (const tweet of newTweets) {
                // 더 엄격한 중복 검사
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
            
            return addedCount;
        };
        
        // 초기 수집
        console.log('🎯 초기 트윗 수집...');
        const allTweets = [];
        const initialTweets = await collectCurrentTweets();
        const initialAdded = addUniqueToCollection(allTweets, initialTweets, 'initial_load');
        
        console.log(`📊 초기 수집: ${initialAdded}개 트윗`);
        console.log(`📈 목표: ${initialAdded}개 → 50-100개 트윗`);
        
        const maxSteps = 50; // 더 많은 스크롤 단계
        const maxTweets = 100;
        let consecutiveNoNew = 0;
        let stepCount = 0;
        
        console.log('\n⚡ 실시간 수집 시작...');
        
        while (stepCount < maxSteps && allTweets.length < maxTweets && consecutiveNoNew < 5) {
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
            
            // ⭐ 즉시 수집
            const currentTweets = await collectCurrentTweets();
            const stepInfo = `step_${stepCount}_${scrollMethod.replace(/\s+/g, '_')}`;
            const addedCount = addUniqueToCollection(allTweets, currentTweets, stepInfo);
            
            console.log(`   📊 DOM에서 발견: ${currentTweets.length}개`);
            console.log(`   ➕ 새로 추가: ${addedCount}개`);
            console.log(`   📈 총 수집: ${allTweets.length}개`);
            
            if (addedCount === 0) {
                consecutiveNoNew++;
                console.log(`   ⚠️ 새 트윗 없음 (연속: ${consecutiveNoNew}/5)`);
            } else {
                consecutiveNoNew = 0;
                console.log(`   ✅ 새 트윗 발견!`);
            }
            
            // 진행률 표시
            const progress = Math.min((allTweets.length / maxTweets) * 100, 100);
            console.log(`   📊 진행률: ${progress.toFixed(1)}%`);
            
            // 목표 달성 확인
            if (allTweets.length >= maxTweets) {
                console.log(`   🎯 목표 ${maxTweets}개 달성!`);
                break;
            }
            
            // 짧은 대기 (다음 스크롤 준비)
            if (stepCount < maxSteps && consecutiveNoNew < 5 && allTweets.length < maxTweets) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`\n✅ ${allTweets.length}개 트윗 수집 완료!`);
        
        if (allTweets.length > 0) {
            // 파일 저장
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `twitter_realtime_collection_${timestamp}.json`;
            
            // 상세 통계
            const stats = {
                totalTweets: allTweets.length,
                initialTweets: initialAdded,
                addedTweets: allTweets.length - initialAdded,
                uniqueUsers: new Set(allTweets.map(t => t.username)).size,
                totalHashtags: allTweets.reduce((acc, t) => acc + t.hashtags.length, 0),
                tweetsWithImages: allTweets.filter(t => t.hasImages).length,
                tweetsWithVideo: allTweets.filter(t => t.hasVideo).length,
                stepsUsed: stepCount,
                successRate: ((allTweets.length - initialAdded) / stepCount * 100).toFixed(1),
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
                    scraper: 'real-time-collection-scraper',
                    version: '7.0',
                    method: 'immediate_collection_per_scroll',
                    virtualScrollSolution: 'collect_immediately_after_each_scroll',
                    success: true,
                    collectedAt: new Date().toISOString()
                },
                statistics: { ...stats, topHashtags, stepStats },
                tweets: allTweets
            };
            
            fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
            console.log(`💾 저장 완료: ${filename}`);
            
            // 성공 리포트
            console.log('\n⚡ 실시간 수집 성공 리포트 ⚡');
            console.log('===============================');
            console.log(`🔢 총 트윗: ${stats.totalTweets}개`);
            console.log(`📈 성장: ${stats.initialTweets}개 → ${stats.totalTweets}개 (+${stats.addedTweets}개)`);
            console.log(`🎯 성공률: ${stats.successRate}% (${stats.addedTweets}개 / ${stats.stepsUsed}단계)`);
            console.log(`👥 고유 사용자: ${stats.uniqueUsers}명`);
            console.log(`🏷️ 총 해시태그: ${stats.totalHashtags}개`);
            console.log(`🖼️ 이미지 포함: ${stats.tweetsWithImages}개`);
            console.log(`🎥 비디오 포함: ${stats.tweetsWithVideo}개`);
            console.log(`🔄 사용된 단계: ${stats.stepsUsed}개`);
            
            if (topHashtags.length > 0) {
                console.log('\n🏆 인기 해시태그 TOP 5:');
                topHashtags.slice(0, 5).forEach((item, index) => {
                    console.log(`   ${index + 1}. ${item.hashtag} (${item.count}회)`);
                });
            }
            
            // 수집 효과가 좋은 단계들
            const effectiveSteps = Object.entries(stepStats)
                .filter(([step, count]) => !step.includes('initial'))
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);
            
            if (effectiveSteps.length > 0) {
                console.log('\n📊 효과적인 수집 단계 TOP 5:');
                effectiveSteps.forEach(([step, count], index) => {
                    console.log(`   ${index + 1}. ${step.replace(/_/g, ' ')}: ${count}개`);
                });
            }
            
            // 샘플 트윗
            console.log('\n📝 수집된 트윗 샘플:');
            
            console.log('\n🆕 최근 수집된 트윗 5개:');
            allTweets.slice(-5).forEach((tweet, idx) => {
                const position = allTweets.length - 4 + idx;
                console.log(`${position}. @${tweet.username}: ${tweet.text.substring(0, 80)}...`);
                if (tweet.collectionStep) {
                    console.log(`    📍 수집: ${tweet.collectionStep.replace(/_/g, ' ')}`);
                }
            });
            
            console.log('\n🎉🎉🎉 실시간 수집 대성공! 🎉🎉🎉');
            console.log(`   가상 스크롤 문제 해결 → ${stats.totalTweets}개 수집!`);
            console.log(`   각 스크롤마다 즉시 수집 → 데이터 손실 방지!`);
            
        } else {
            console.log('\n⚠️ 수집된 트윗이 없습니다.');
        }
        
        // 브라우저 연결 해제
        browser.disconnect();
        console.log('\n🔗 브라우저 연결 해제');
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

// 실행
realTimeCollectionScraper().catch(console.error);