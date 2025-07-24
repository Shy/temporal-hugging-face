"""
Flask application for managing Temporal workflows with real-time status updates.
This app provides a web interface for submitting questions to a hugging face model
and monitoring workflow execution of that hugging face model.
"""

from temporalio.client import Client
from workflows import askQuestion
from nanoid import generate
import asyncio
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit

# Initialize Flask and SocketIO
app = Flask(__name__)
app.config["SECRET_KEY"] = "secret!"
socketio = SocketIO()
socketio.init_app(app)


@app.route("/", methods=["GET"])
def index():
    """Serve the main page"""
    return render_template("base.html")


async def start_ask_question(prompt):
    """
    Start a new Temporal workflow to process a question

    Args:
        prompt (str): The question to process

    Returns:
        None: Emits results via WebSocket
    """
    # Connect to Temporal server
    client = await Client.connect("localhost:7233")

    # Start the workflow with a unique ID
    workflow_id = "question-workflow-" + generate(size=5)
    handle = await client.start_workflow(
        askQuestion.run,
        prompt,
        id=workflow_id,
        task_queue="question-task-queue",
    )

    print(f"Started workflow. ID: {handle.id}, RunID: {handle.result_run_id}")

    # Notify client that workflow was accepted
    emit(
        "accepted",
        {
            "id": handle.id,
            "run_id": handle.result_run_id,
            "prompt": prompt,
        },
    )

    # Wait for workflow completion and send result
    result = await handle.result()
    emit(
        "response",
        {
            "id": handle.id,
            "run_id": handle.result_run_id,
            "response": result,
            "prompt": prompt,
        },
    )


async def get_workflow_statuses(workflow_ids):
    """
    Get detailed status information for multiple workflows

    Args:
        workflow_ids (list): List of workflow IDs to check

    Returns:
        None: Emits results via WebSocket
    """
    client = await Client.connect("localhost:7233")
    workflows = []

    try:
        for workflow_id in workflow_ids:
            try:
                # Get workflow details
                handle = client.get_workflow_handle(workflow_id=workflow_id)
                description = await handle.describe()

                # Determine detailed status
                detailed_status = description.status.name

                # Provide more specific status for running workflows
                if description.status.name == "RUNNING":
                    if (
                        hasattr(description, "pending_workflow_task")
                        and description.pending_workflow_task
                    ):
                        detailed_status = "AWAITING_WORKER"
                    elif (
                        hasattr(description, "pending_activities")
                        and description.pending_activities
                    ):
                        detailed_status = "RUNNING_ACTIVITIES"

                # Build workflow info object
                workflow_info = {
                    "id": workflow_id,
                    "run_id": description.run_id,
                    "workflow_type": description.workflow_type,
                    "status": detailed_status,
                    "original_status": description.status.name,
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
                    "task_queue": description.task_queue,
                }
                workflows.append(workflow_info)

            except Exception as e:
                print(f"Error getting workflow details for {workflow_id}: {e}")
                workflows.append(
                    {"id": workflow_id, "status": "UNKNOWN", "error": str(e)}
                )

    except Exception as e:
        print(f"Error getting workflow statuses: {e}")
        emit("workflow_statuses_error", {"error": str(e)})
        return

    # Send workflow statuses to client
    emit("workflow_statuses", {"workflows": workflows})


# WebSocket event handlers
@socketio.on("prompt")
def process_question(prompt):
    """Handle new question submission from client"""
    print(f"Received question: {prompt}")
    asyncio.run(start_ask_question(prompt))


@socketio.on("get_workflow_statuses")
def handle_get_workflow_statuses(workflow_ids):
    """Handle request for workflow status updates"""
    print(f"Status request for {len(workflow_ids)} workflows")
    asyncio.run(get_workflow_statuses(workflow_ids))


@socketio.on("connect")
def handle_connect():
    """Handle client connection"""
    print(f"Client connected: {request.sid}")
    emit("connect", {"data": f"Client {request.sid} connected"})


@socketio.on("disconnect")
def handle_disconnect():
    """Handle client disconnection"""
    print(f"Client disconnected: {request.sid}")
    emit("disconnect", f"Client {request.sid} disconnected", broadcast=True)


if __name__ == "__main__":
    socketio.run(app, debug=True)
