import subprocess
import sys
try:
    import auditok
except ImportError:
    print("Installing auditok...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "auditok", "--break-system-packages"])
    import auditok
print("Auditok is available!")
