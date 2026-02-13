#!/bin/bash
cd "$(dirname "$0")"

# Check if we are running in a terminal
if [ ! -t 0 ]; then
  # Try to launch a terminal emulator
  if command -v konsole >/dev/null 2>&1; then
    exec konsole -e "$0" "$@"
  elif command -v gnome-terminal >/dev/null 2>&1; then
    exec gnome-terminal -- "$0" "$@"
  elif command -v xterm >/dev/null 2>&1; then
    exec xterm -e "$0" "$@"
  fi
  # If no known terminal is found, we might be in an environment that doesn't support it or just fallback to running without one (though user won't see output)
fi

# Check if port 3000 is in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  WARNING: Port 3000 is already in use!"
    echo "The Melodiq Server requires port 3000 to be free."
    
    # Try to identify the process
    PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
    echo "Blocking process PID: $PID"
    ps -p $PID -o comm=
    
    echo ""
    read -p "Do you want to try to kill this process? (y/N) " response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])+$ ]]; then
        kill $PID
        sleep 1
        if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
             echo "❌ Failed to kill process. Please manually close the application using port 3000."
             echo "Press Enter to exit..."
             read
             exit 1
        else
             echo "✅ Process killed. Starting server..."
        fi
    else
        echo "Please ensure port 3000 is free and try again."
        echo "Press Enter to exit..."
        read
        exit 1
    fi
fi

echo "Starting Melodiq Server..."
./melodiq-server-linux
EXIT_CODE=$?
echo "Server exited with code $EXIT_CODE"
echo "Press Enter to close this window..."
read
exit $EXIT_CODE
