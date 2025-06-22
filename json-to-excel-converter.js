// json-to-excel-converter.js - Twitter JSON 데이터를 엑셀로 변환

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

async function convertTwitterJsonToExcel() {
    console.log('📊 Twitter JSON → Excel 변환기 시작\n');
    
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
        
        // 계정명 추출 함수
        const extractUsername = (uniqueId) => {
            try {
                // uniqueId 형식: "username_datetime_content"
                const parts = uniqueId.split('_');
                return parts[0] || 'unknown';
            } catch (error) {
                console.log(`⚠️ 계정명 추출 실패: ${uniqueId}`);
                return 'unknown';
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
                    '계정명': extractUsername(tweet.uniqueId),
                    '게시일자': convertToKoreanTime(tweet.datetime),
                    '링크': tweet.link || '',
                    // 추가 정보 (선택사항)
                    '트윗내용': tweet.text ? tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : '') : '',
                    '해시태그': tweet.hashtags ? tweet.hashtags.join(', ') : '',
                    '좋아요': tweet.interactions ? tweet.interactions.likes : '',
                    '리트윗': tweet.interactions ? tweet.interactions.retweets : '',
                    '답글': tweet.interactions ? tweet.interactions.replies : '',
                    '이미지여부': tweet.hasImages ? 'Y' : 'N',
                    '비디오여부': tweet.hasVideo ? 'Y' : 'N'
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
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        
        // 워크시트 이름 설정
        const sheetName = 'Twitter데이터';
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        // 컬럼 너비 자동 조정
        const colWidths = [
            { wch: 15 }, // 계정명
            { wch: 20 }, // 게시일자
            { wch: 50 }, // 링크
            { wch: 30 }, // 트윗내용
            { wch: 20 }, // 해시태그
            { wch: 10 }, // 좋아요
            { wch: 10 }, // 리트윗
            { wch: 10 }, // 답글
            { wch: 10 }, // 이미지여부
            { wch: 10 }  // 비디오여부
        ];
        worksheet['!cols'] = colWidths;
        
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
            console.log(`   계정명: ${row['계정명']}`);
            console.log(`   게시일자: ${row['게시일자']}`);
            console.log(`   링크: ${row['링크']}`);
            console.log(`   내용: ${row['트윗내용']}`);
        });
        
        // 통계 정보
        console.log('\n📊 변환 통계:');
        console.log('==============');
        
        // 고유 계정 수
        const uniqueAccounts = new Set(excelData.map(row => row['계정명']));
        console.log(`고유 계정 수: ${uniqueAccounts.size}개`);
        
        // 날짜별 분포
        const dateCount = {};
        excelData.forEach(row => {
            const date = row['게시일자'].split(' ')[0]; // 날짜 부분만 추출
            dateCount[date] = (dateCount[date] || 0) + 1;
        });
        
        console.log('\n📅 날짜별 트윗 수:');
        Object.entries(dateCount)
            .sort(([a], [b]) => b.localeCompare(a)) // 최신순 정렬
            .slice(0, 7) // 최근 7일만 표시
            .forEach(([date, count]) => {
                console.log(`   ${date}: ${count}개`);
            });
        
        // 이미지/비디오 통계
        const imageCount = excelData.filter(row => row['이미지여부'] === 'Y').length;
        const videoCount = excelData.filter(row => row['비디오여부'] === 'Y').length;
        
        console.log(`\n📷 이미지 포함 트윗: ${imageCount}개 (${(imageCount/excelData.length*100).toFixed(1)}%)`);
        console.log(`🎥 비디오 포함 트윗: ${videoCount}개 (${(videoCount/excelData.length*100).toFixed(1)}%)`);
        
        console.log('\n🎉🎉🎉 Excel 변환 완료! 🎉🎉🎉');
        console.log(`📁 파일 위치: ${path.resolve(excelFileName)}`);
        console.log(`📊 총 ${excelData.length}개 트윗이 변환되었습니다.`);
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        console.error('상세 오류:', error.stack);
    }
}

// 실행
convertTwitterJsonToExcel().catch(console.error);