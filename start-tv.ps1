cd C:\tvmenu

Start-Process cmd -ArgumentList '/c npm start' -WindowStyle Minimized

Start-Sleep -Seconds 8

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

Start-Process $edge -ArgumentList '--kiosk http://localhost:3000/menu/ --edge-kiosk-type=fullscreen --no-first-run --user-data-dir="C:\tvmenu\edge-menu-profile" --window-position=0,0 --window-size=1920,1080'

Start-Sleep -Seconds 4

Start-Process $edge -ArgumentList '--kiosk http://localhost:3000/orders/ --edge-kiosk-type=fullscreen --no-first-run --user-data-dir="C:\tvmenu\edge-orders-profile" --window-position=1920,0 --window-size=1920,1080'
