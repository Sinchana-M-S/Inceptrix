@echo off
echo Starting MongoDB...
echo Data Directory: "C:\Users\sinch\Desktop\Inceptrix\apexbank-landing-page (1)\database_data"
"C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --dbpath "C:\Users\sinch\Desktop\Inceptrix\apexbank-landing-page (1)\database_data" --bind_ip 127.0.0.1
pause
