#!/bin/bash
cd "$(dirname "$0")"

# Check if port 3000 is in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  WARNING: Port 3000 is already in use!"
    echo "The Melodiq Server requires port 3000 to be free."
    
    # Try to identify the process
    PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
    # Get the command name associated with the PID
    CMD=$(ps -p $PID -o comm=)
    echo "Blocking process PID: $PID ($CMD)"
    
    echo ""
    read -p "Do you want to try to kill this process? (y/N) " response
    # Check if the response starts with y or Y
    if [[ "$response" =~ ^[yY] ]]; then
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
./melodiq-server-macos
EXIT_CODE=$?
echo "Server exited with code $EXIT_CODE"
echo "Press Enter to close this window..."
read
exit $EXIT_CODE
