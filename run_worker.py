"""
Temporal Worker Process for AI Question Processing

This script starts a Temporal worker that can execute our AI workflows.
Workers are long-running processes that:
1. Connect to the Temporal server
2. Pre-load AI models for fast inference
3. Poll for workflow and activity tasks
4. Execute AI inference when requested
5. Handle retries, timeouts, and failures automatically

Run this script to start a worker: python run_worker.py
"""

# Standard library imports
import asyncio  # For running async operations
import sys  # For system exit on initialization failures
import logging  # For structured logging throughout execution

# Temporal framework components
from temporalio.client import Client  # Connect to Temporal server
from temporalio.worker import Worker  # Execute workflows and activities

# Our application components
from activities import ask_question  # AI inference activity
from workflows import askQuestion  # Orchestration workflow
from model_manager import model_manager  # AI model management

# Configure logging for worker operations
# This helps track model loading, workflow execution, and any errors
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def main():
    """
    Main worker startup sequence.

    This function:
    1. Pre-loads AI models into memory for fast inference
    2. Connects to the Temporal server
    3. Registers available workflows and activities
    4. Starts polling for work (blocks until shutdown)
    """
    # === Model Initialization Phase ===
    # Load AI models before accepting any work to ensure fast responses
    logger.info("Starting worker initialization...")
    try:
        await model_manager.initialize_models()
        logger.info("Models initialized successfully")
    except Exception as e:
        # Exit if models can't be loaded - worker would be useless without them
        logger.error(f"Failed to initialize models: {e}")
        sys.exit(1)

    # === Temporal Connection Phase ===
    # Connect to the local Temporal server
    # In production, this would connect to a Temporal cluster
    client = await Client.connect(
        "localhost:7233",  # Temporal server address
        namespace="default",  # Logical grouping for workflows
    )

    # === Worker Configuration Phase ===
    # Create a worker that can handle our specific workflows and activities
    worker = Worker(
        client,  # Connection to Temporal server
        task_queue="question-task-queue",  # Queue name to poll for tasks
        workflows=[askQuestion],  # Workflow types this worker can execute
        activities=[ask_question],  # Activity types this worker can execute
    )

    # === Execution Phase ===
    # Start the worker - this blocks until manually stopped (Ctrl+C)
    # The worker will continuously poll for tasks and execute them
    logger.info("Worker started and polling for tasks...")
    await worker.run()


# === Application Entry Point ===
if __name__ == "__main__":
    """
    Start the worker when run directly: python run_worker.py

    The worker will:
    - Load AI models (may take 1-2 minutes first time)
    - Connect to Temporal server on localhost:7233
    - Begin processing AI question workflows
    - Run until manually stopped (Ctrl+C)
    """
    try:
        # Run the async main function
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker shutdown requested by user")
    except Exception as e:
        logger.error(f"Worker failed with error: {e}")
        sys.exit(1)
