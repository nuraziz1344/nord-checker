bash -c "if ! ls -al /run/nordvpn; then mkdir /run/nordvpn; fi" 
/usr/sbin/nordvpnd>/dev/null& 
/usr/bin/python main.py 