"""
Flask web application for the Temporal Hugging Face Question Planetarium.

This web interface allows users to:
1. Submit questions to different AI models (SmolLM3-3B or 20b via Ollama)
2. Monitor workflow execution in real-time using WebSockets
3. View workflow status and execution details

The app integrates Flask with Temporal
and uses SocketIO for real-time bidirectional communication with the browser.
"""

# Temporal client for connecting to the Temporal server and managing workflows
from temporalio.client import Client

# Our custom workflow definition
from workflows import askQuestion

# nanoid for generating short, unique workflow identifiers
from nanoid import generate

# asyncio for running async Temporal operations in Flask's sync context
import asyncio

# Flask web framework components
from flask import Flask, render_template, request

# Flask-SocketIO for real-time WebSocket communication
from flask_socketio import SocketIO, emit

# Initialize Flask application
app = Flask(__name__)

# Secret key for session management and SocketIO
# In production, use a secure random key stored as an environment variable
app.config["SECRET_KEY"] = "secret!"

# Initialize SocketIO for real-time WebSocket communication
socketio = SocketIO()
socketio.init_app(app)  # Attach SocketIO to the Flask app


@app.route("/", methods=["GET"])
def index():
    return render_template("base.html")


async def start_ask_question(data):
    """
    Start a new Temporal workflow to process a user's AI question.

    This function:
    1. Connects to the Temporal server
    2. Starts a new workflow with a unique ID
    3. Notifies the client via WebSocket when accepted
    4. Waits for completion and sends the AI response

    Args:
        data (dict): Contains 'prompt' (user question) and 'model' (AI model choice)

    Returns:
        None: Results are sent to client via WebSocket emissions
    """
    # Connect to the local Temporal server
    # In production, this would connect to a remote Temporal cluster
    client = await Client.connect("localhost:7233")

    # Generate a unique workflow ID using nanoid (short, URL-safe)
    workflow_id = "question-workflow-" + generate(size=5)

    # Start the askQuestion workflow with user's prompt and model choice
    handle = await client.start_workflow(
        askQuestion.run,  # The workflow method to execute
        args=(data["prompt"], data["model"]),  # Arguments to pass
        id=workflow_id,  # Unique identifier for this workflow
        task_queue="question-task-queue",  # Queue where workers pick up tasks
    )

    print(f"Started workflow. ID: {handle.id}, RunID: {handle.result_run_id}")

    # Immediately notify the browser that workflow was accepted and started
    # This provides instant feedback while AI inference happens in background
    emit(
        "accepted",  # Event name the JavaScript client listens for
        {
            "id": handle.id,  # Workflow identifier
            "run_id": handle.result_run_id,  # Specific execution run ID
            "prompt": data["prompt"],  # Echo back the original question
            "model": data["model"],  # Echo back the selected model
        },
    )

    # Wait for the AI inference workflow to complete
    # This blocks until the model generates a response (could take minutes)
    result = await handle.result()

    # Send the AI-generated response back to the browser
    emit(
        "response",  # Event name for completed responses
        {
            "id": handle.id,  # Match with original request
            "run_id": handle.result_run_id,  # Execution details
            "response": result,  # The actual AI-generated text
            "prompt": data["prompt"],  # Original question for context
        },
    )


async def get_workflow_statuses(workflow_ids):
    """
    Retrieve detailed status information for multiple Temporal workflows
    to enables the web interface to show real-time status updates.

    Args:
        workflow_ids (list): List of workflow IDs to check status for

    Returns:
        None: Status information sent via WebSocket to browser
    """
    # Connect to Temporal server to query workflow information
    client = await Client.connect("localhost:7233")
    workflows = []  # Collect status info for all requested workflows

    try:
        # Check status of each requested workflow
        for workflow_id in workflow_ids:
            try:
                # Get a handle to the existing workflow
                handle = client.get_workflow_handle(workflow_id=workflow_id)

                # Retrieve detailed workflow execution information
                description = await handle.describe()

                # Start with basic status from Temporal
                detailed_status = description.status.name

                # Provide more granular status for actively running workflows
                # This helps users understand what's happening during long AI inference
                if description.status.name == "RUNNING":
                    if (
                        hasattr(description, "pending_workflow_task")
                        and description.pending_workflow_task
                    ):
                        detailed_status = "AWAITING_WORKER"  # Waiting for worker pickup
                    elif (
                        hasattr(description, "pending_activities")
                        and description.pending_activities
                    ):
                        detailed_status = "RUNNING_ACTIVITIES"  # AI is processing

                # Build comprehensive workflow information for the web UI
                workflow_info = {
                    "id": workflow_id,  # Unique workflow identifier
                    "run_id": description.run_id,  # Specific execution run
                    "workflow_type": description.workflow_type,  # askQuestion
                    "status": detailed_status,  # Enhanced status description
                    "original_status": description.status.name,  # Raw Temporal status
                    # Convert timestamps to ISO format for JavaScript consumption
                    "start_time": (
                        description.start_time.isoformat()
                        if description.start_time
                        else None
                    ),
                    "execution_time": (
                        description.execution_time.isoformat()
                        if description.execution_time
                        else None
                    ),
                    "close_time": (
                        description.close_time.isoformat()
                        if description.close_time
                        else None
                    ),
                    "task_queue": description.task_queue,  # Worker queue name
                }
                workflows.append(workflow_info)

            except Exception as e:
                # Handle cases where workflow doesn't exist or is inaccessible
                print(f"Error getting workflow details for {workflow_id}: {e}")
                workflows.append(
                    {"id": workflow_id, "status": "UNKNOWN", "error": str(e)}
                )

    except Exception as e:
        # Handle connection errors or other system-level issues
        print(f"Error getting workflow statuses: {e}")
        emit("workflow_statuses_error", {"error": str(e)})
        return

    # Send all workflow status information to the browser
    emit("workflow_statuses", {"workflows": workflows})


# === WebSocket Event Handlers ===
# These functions respond to real-time events from the browser


@socketio.on("prompt")  # Listen for 'prompt' events from JavaScript
def process_question(data):
    """
    Handle new AI question submissions from the web interface.

    When users submit a question via the web form, this handler:
    1. Logs the request for debugging
    2. Starts a new Temporal workflow
    3. Returns immediately (workflow runs asynchronously)
    """
    print(f"Received question: {data['prompt']} with model: {data['model']}")
    # Run the async workflow function in the event loop
    asyncio.run(start_ask_question(data))


@socketio.on("get_workflow_statuses")  # Listen for status check requests
def handle_get_workflow_statuses(workflow_ids):
    """
    Handle requests for real-time workflow status updates.

    The web interface periodically requests status updates to show
    progress of AI inference tasks. This provides live feedback
    without requiring page refreshes.
    """
    print(f"Status request for {len(workflow_ids)} workflows")
    # Execute the async status checking function
    asyncio.run(get_workflow_statuses(workflow_ids))


@socketio.on("connect")  # Triggered when browser establishes WebSocket connection
def handle_connect():
    """
    Handle new WebSocket connections from browsers.

    This confirms the real-time communication channel is established
    and ready for bidirectional messaging between browser and server.
    """
    print(f"Client connected: {request.sid}")
    # Acknowledge connection to the client
    emit("connect", {"data": f"Client {request.sid} connected"})


@socketio.on("disconnect")  # Triggered when browser closes or navigates away
def handle_disconnect():
    """
    Handle WebSocket disconnections (browser closed, network issues, etc.).

    This cleanup ensures server resources are properly released and
    other clients can be notified if needed.
    """
    print(f"Client disconnected: {request.sid}")
    # Optionally notify other connected clients about the disconnection
    emit("disconnect", f"Client {request.sid} disconnected", broadcast=True)


# === Application Entry Point ===
if __name__ == "__main__":
    # Start the Flask-SocketIO server in development mode
    # debug=True enables auto-reload on code changes and detailed error pages
    socketio.run(
        app,
        debug=True,  # Enable development features
        # Default: host='127.0.0.1', port=5000
    )
