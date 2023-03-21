import os
from time import sleep

for i in range(60):
    print(f"count: {i}")
    os.system(f"echo 'system count: {i}'")
    sleep(1)