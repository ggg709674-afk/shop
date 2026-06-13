@echo off
cd /d "%USERPROFILE%\Desktop\mobile-shop-rental"
echo.
echo ======================================
echo  mobile-shop-rental 배포 시작
echo ======================================
echo.
vercel --prod
echo.
echo ======================================
echo  배포 완료.
echo  Vercel 프로젝트명: mobile-shop-rental
echo ======================================
pause
