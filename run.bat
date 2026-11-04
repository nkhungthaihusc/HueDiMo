@echo off
chcp 65001 >nul
title HueDiMo Spring Boot Server
cd /d "%~dp0backend-spring"
call run.bat
