@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ============================================
echo   합본 사이트 미리보기
echo  --------------------------------------------
echo   잠시 후 브라우저가 자동으로 열립니다.
echo   주소: http://localhost:4317
echo.
echo   * 이 검은 창을 닫으면 사이트가 꺼집니다.
echo   * 처음 실행 시 몇 초 걸릴 수 있어요.
echo     에러 화면이 보이면 새로고침(F5) 한 번 하세요.
echo  ============================================
echo.
start "" cmd /c "timeout /t 4 >nul & start """" http://localhost:4317"
npx -y serve -l 4317 .
pause
