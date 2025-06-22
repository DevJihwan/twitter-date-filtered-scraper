// json-to-excel-converter.js - Twitter JSON 데이터를 엑셀로 변환 (개선 버전)

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

async function convertTwitterJsonToExcel() {
    console.log('📊 Twitter JSON → Excel 변환기 시작 (v2.0)\n');
    
    try {
        // JSON 파일 찾기
        const currentDir = process.cwd();
        const files = fs.readdirSync(currentDir);
        
        // Twitter JSON 파일들 찾기
        const twitterJsonFiles = files.filter(file => 
            file.includes('twitter') && 
            file.endsWith('.json') && 
            (file.includes('date_filtered') || file.includes('realtime_collection'))
        );
        
        if (twitterJsonFiles.length === 0) {
            console.log('❌ Twitter JSON 파일을 찾을 수 없습니다.');
            console.log('   다음과 같은 파일명을 찾고 있습니다:');
            console.log('   - twitter_date_filtered_*.json');
            console.log('   - twitter_realtime_collection_*.json');
            return;
        }
        
        console.log(`📁 발견된 JSON 파일: ${twitterJsonFiles.length}개`);
        twitterJsonFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file}`);
        });
        
        // 가장 최근 파일 선택 (파일명의 타임스탬프 기준)
        const latestFile = twitterJsonFiles.sort().reverse()[0];
        console.log(`\n✅ 처리할 파일: ${latestFile}`);
        
        // JSON 파일 읽기
        const jsonData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
        
        if (!jsonData.tweets || !Array.isArray(jsonData.tweets)) {
            console.log('❌ 올바른 트윗 데이터를 찾을 수 없습니다.');
            return;
        }
        
        console.log(`📊 총 트윗 수: ${jsonData.tweets.length}개`);
        console.log(`📈 수집 통계: ${jsonData.statistics.totalTweets}개 트윗, ${jsonData.statistics.uniqueUsers}명 사용자`);
        
        // 한국시간 변환 함수
        const convertToKoreanTime = (utcDatetime) => {
            try {
                const utcDate = new Date(utcDatetime);
                // 한국시간은 UTC+9
                const koreanDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
                
                // YYYY-MM-DD HH:mm:ss 형식으로 변환
                const year = koreanDate.getFullYear();
                const month = String(koreanDate.getMonth() + 1).padStart(2, '0');
                const day = String(koreanDate.getDate()).padStart(2, '0');
                const hours = String(koreanDate.getHours()).padStart(2, '0');
                const minutes = String(koreanDate.getMinutes()).padStart(2, '0');
                const seconds = String(koreanDate.getSeconds()).padStart(2, '0');
                
                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            } catch (error) {
                console.log(`⚠️ 날짜 변환 실패: ${utcDatetime}`);
                return utcDatetime; // 변환 실패시 원본 반환
            }
        };
        
        // 숫자 추출 함수 (좋아요, 리트윗, 답글 수에서 숫자만 추출)
        const extractNumber = (str) => {
            try {
                if (!str) return 0;
                const match = str.match(/\d+/);
                return match ? parseInt(match[0]) : 0;
            } catch (error) {
                return 0;
            }
        };
        
        // 엑셀 데이터 준비
        const excelData = [];
        let successCount = 0;
        let errorCount = 0;
        
        console.log('\n🔄 데이터 변환 중...');
        
        jsonData.tweets.forEach((tweet, index) => {
            try {
                const row = {
                    '계정명': tweet.username || 'unknown',
                    '표시명': tweet.displayName || '',
                    '게시일자': convertToKoreanTime(tweet.datetime),
                    '링크': tweet.link || '',
                    '트윗내용': tweet.text ? tweet.text.replace(/\n/g, ' ').substring(0, 200) + (tweet.text.length > 200 ? '...' : '') : '',
                    '해시태그': tweet.hashtags ? tweet.hashtags.join(', ') : '',
                    '좋아요수': extractNumber(tweet.interactions?.likes),
                    '리트윗수': extractNumber(tweet.interactions?.retweets),
                    '답글수': extractNumber(tweet.interactions?.replies),
                    '이미지수': tweet.imageCount || 0,
                    '이미지여부': tweet.hasImages ? 'Y' : 'N',
                    '비디오여부': tweet.hasVideo ? 'Y' : 'N',
                    '수집단계': tweet.collectionStep || '',
                    '수집시간': tweet.scrapedAt ? convertToKoreanTime(tweet.scrapedAt) : ''
                };
                
                excelData.push(row);
                successCount++;
                
                // 진행상황 표시 (10개마다)
                if ((index + 1) % 10 === 0) {
                    console.log(`   처리 중: ${index + 1}/${jsonData.tweets.length}`);
                }
                
            } catch (error) {
                console.log(`⚠️ 트윗 처리 실패 (${index + 1}번째): ${error.message}`);
                errorCount++;
            }
        });
        
        console.log(`\n✅ 변환 완료:`);
        console.log(`   성공: ${successCount}개`);
        console.log(`   실패: ${errorCount}개`);
        
        if (excelData.length === 0) {
            console.log('❌ 변환할 데이터가 없습니다.');
            return;
        }
        
        // 엑셀 워크북 생성
        const workbook = XLSX.utils.book_new();
        
        // 1. 트윗 데이터 시트
        const tweetWorksheet = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(workbook, tweetWorksheet, 'Twitter데이터');
        
        // 컬럼 너비 자동 조정
        const colWidths = [
            { wch: 15 }, // 계정명
            { wch: 15 }, // 표시명
            { wch: 20 }, // 게시일자
            { wch: 50 }, // 링크
            { wch: 40 }, // 트윗내용
            { wch: 30 }, // 해시태그
            { wch: 8 },  // 좋아요수
            { wch: 8 },  // 리트윗수
            { wch: 8 },  // 답글수
            { wch: 8 },  // 이미지수
            { wch: 10 }, // 이미지여부
            { wch: 10 }, // 비디오여부
            { wch: 15 }, // 수집단계
            { wch: 20 }  // 수집시간
        ];
        tweetWorksheet['!cols'] = colWidths;
        
        // 2. 통계 정보 시트
        const statsData = [
            { '항목': '총 트윗 수', '값': jsonData.statistics.totalTweets },
            { '항목': '고유 사용자 수', '값': jsonData.statistics.uniqueUsers },
            { '항목': '총 해시태그 수', '값': jsonData.statistics.totalHashtags },
            { '항목': '이미지 포함 트윗', '값': jsonData.statistics.tweetsWithImages },
            { '항목': '비디오 포함 트윗', '값': jsonData.statistics.tweetsWithVideo },
            { '항목': '사용된 수집 단계', '값': jsonData.statistics.stepsUsed },
            { '항목': '수집 기간 (일)', '값': jsonData.statistics.dateRange.totalDays },
            { '항목': '가장 오래된 날짜', '값': jsonData.statistics.dateRange.oldest },
            { '항목': '가장 최신 날짜', '값': jsonData.statistics.dateRange.newest },
            { '항목': '필터 기준 날짜', '값': jsonData.statistics.dateFilter.cutoffDate },
            { '항목': '수집 완료 시간', '값': convertToKoreanTime(jsonData.statistics.collectedAt) }
        ];
        
        const statsWorksheet = XLSX.utils.json_to_sheet(statsData);
        XLSX.utils.book_append_sheet(workbook, statsWorksheet, '수집통계');
        
        // 3. 인기 해시태그 시트
        if (jsonData.statistics.topHashtags && jsonData.statistics.topHashtags.length > 0) {
            const hashtagData = jsonData.statistics.topHashtags.map((item, index) => ({
                '순위': index + 1,
                '해시태그': item.hashtag,
                '사용횟수': item.count,
                '비율(%)': ((item.count / jsonData.statistics.totalHashtags) * 100).toFixed(1)
            }));
            
            const hashtagWorksheet = XLSX.utils.json_to_sheet(hashtagData);
            XLSX.utils.book_append_sheet(workbook, hashtagWorksheet, '인기해시태그');
        }
        
        // 파일명 생성
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const baseFileName = latestFile.replace('.json', '');
        const excelFileName = `${baseFileName}_엑셀변환_${timestamp}.xlsx`;
        
        // 엑셀 파일 저장
        XLSX.writeFile(workbook, excelFileName);
        
        console.log(`\n💾 엑셀 파일 저장 완료: ${excelFileName}`);
        
        // 샘플 데이터 표시
        console.log('\n📋 변환된 데이터 샘플 (처음 3개):');
        console.log('=====================================');
        
        excelData.slice(0, 3).forEach((row, index) => {
            console.log(`\n${index + 1}번째 트윗:`);
            console.log(`   계정명: ${row['계정명']} ${row['표시명'] ? `(${row['표시명']})` : ''}`);
            console.log(`   게시일자: ${row['게시일자']}`);
            console.log(`   상호작용: 좋아요 ${row['좋아요수']}, 리트윗 ${row['리트윗수']}, 답글 ${row['답글수']}`);
            console.log(`   내용: ${row['트윗내용']}`);
        });
        
        // 통계 정보
        console.log('\n📊 변환 통계:');
        console.log('==============');
        
        // 고유 계정 수
        const uniqueAccounts = new Set(excelData.map(row => row['계정명']));
        console.log(`고유 계정 수: ${uniqueAccounts.size}개`);
        
        // 가장 활발한 계정 TOP 5
        const accountCount = {};
        excelData.forEach(row => {
            accountCount[row['계정명']] = (accountCount[row['계정명']] || 0) + 1;
        });
        
        const topAccounts = Object.entries(accountCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        console.log('\n👑 가장 활발한 계정 TOP 5:');
        topAccounts.forEach(([account, count], index) => {
            console.log(`   ${index + 1}. ${account}: ${count}개 트윗`);
        });
        
        // 날짜별 분포
        const dateCount = {};
        excelData.forEach(row => {
            const date = row['게시일자'].split(' ')[0]; // 날짜 부분만 추출
            dateCount[date] = (dateCount[date] || 0) + 1;
        });
        
        console.log('\n📅 날짜별 트윗 수:');
        Object.entries(dateCount)
            .sort(([a], [b]) => b.localeCompare(a)) // 최신순 정렬
            .forEach(([date, count]) => {
                console.log(`   ${date}: ${count}개`);
            });
        
        // 상호작용 통계
        const totalLikes = excelData.reduce((sum, row) => sum + (row['좋아요수'] || 0), 0);
        const totalRetweets = excelData.reduce((sum, row) => sum + (row['리트윗수'] || 0), 0);
        const totalReplies = excelData.reduce((sum, row) => sum + (row['답글수'] || 0), 0);
        
        console.log('\n💝 상호작용 통계:');
        console.log(`   총 좋아요: ${totalLikes.toLocaleString()}개`);
        console.log(`   총 리트윗: ${totalRetweets.toLocaleString()}개`);
        console.log(`   총 답글: ${totalReplies.toLocaleString()}개`);
        console.log(`   평균 좋아요: ${(totalLikes/excelData.length).toFixed(1)}개/트윗`);
        
        // 이미지/비디오 통계
        const imageCount = excelData.filter(row => row['이미지여부'] === 'Y').length;
        const videoCount = excelData.filter(row => row['비디오여부'] === 'Y').length;
        const totalImages = excelData.reduce((sum, row) => sum + (row['이미지수'] || 0), 0);
        
        console.log(`\n📷 미디어 통계:`);
        console.log(`   이미지 포함 트윗: ${imageCount}개 (${(imageCount/excelData.length*100).toFixed(1)}%)`);
        console.log(`   비디오 포함 트윗: ${videoCount}개 (${(videoCount/excelData.length*100).toFixed(1)}%)`);
        console.log(`   총 이미지 수: ${totalImages}개`);
        
        // 인기 해시태그 표시 (JSON 데이터에서)
        if (jsonData.statistics.topHashtags && jsonData.statistics.topHashtags.length > 0) {
            console.log('\n🏆 인기 해시태그 TOP 5:');
            jsonData.statistics.topHashtags.slice(0, 5).forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.hashtag}: ${item.count}회`);
            });
        }
        
        console.log('\n🎉🎉🎉 Excel 변환 완료! 🎉🎉🎉');
        console.log(`📁 파일 위치: ${path.resolve(excelFileName)}`);
        console.log(`📊 총 ${excelData.length}개 트윗이 변환되었습니다.`);
        console.log(`📋 생성된 시트: ${workbook.SheetNames.length}개`);
        console.log(`   - ${workbook.SheetNames.join(', ')}`);
        
        console.log('\n📊 Excel 파일에 포함된 정보:');
        console.log('   ✅ 트윗 데이터 (한국시간 변환)');
        console.log('   ✅ 수집 통계 정보');
        if (jsonData.statistics.topHashtags) console.log('   ✅ 인기 해시태그 순위');
        console.log('   ✅ 상호작용 수 (숫자 형태)');
        console.log('   ✅ 미디어 정보 (이미지/비디오)');
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        console.error('상세 오류:', error.stack);
    }
}

// 실행
convertTwitterJsonToExcel().catch(console.error);