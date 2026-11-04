@echo off
chcp 65001 >nul
title HueDiMo Spring Boot Server
cd /d "%~dp0"
echo ========================================================
echo   [HueDiMo] Dang khoi dong Spring Boot Backend Server...
echo   Nhan Ctrl + C de dung tien trinh bat cu luc nao.
echo ========================================================
set MAVEN_OPTS=-Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8
.\mvnw.cmd spring-boot:run
